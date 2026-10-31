import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createShippingProfilesWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { createSellerStockLocationsWorkflow } from "@mercurjs/core/workflows"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type CatalogoModuleService from "../modules/catalogo/service"

const SHIPPING_PROFILE_NAME = "Marketplace Shipping"

export async function getOrCreateProfile(
  container: MedusaContainer,
  sellerId: string
) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [profile] = await catalogo.listVendorProfiles({ seller_id: sellerId })
  return profile ?? catalogo.createVendorProfiles({ seller_id: sellerId })
}

/**
 * Prepara lo que una oferta de Mercur necesita (bodega y perfil de envío).
 * Es idempotente y corre en la primera importación, para que el proveedor no lo configure a mano.
 */
export async function ensureSellerCatalogSetup(
  container: MedusaContainer,
  sellerId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: ["id", "name", "handle", "currency_code", "members.id"],
    filters: { id: sellerId },
  })
  const memberId = seller?.members?.[0]?.id
  if (!memberId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `El proveedor ${sellerId} no tiene miembros`
    )
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { name: SHIPPING_PROFILE_NAME },
  })
  const shippingProfileId =
    profiles[0]?.id ??
    (
      await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: SHIPPING_PROFILE_NAME, type: "default" }] },
      })
    ).result[0].id

  const profile = await getOrCreateProfile(container, sellerId)
  let stockLocationId = profile.stock_location_id
  if (!stockLocationId) {
    const { result } = await createSellerStockLocationsWorkflow(container).run({
      input: {
        seller_id: sellerId,
        locations: [
          {
            name: `${seller.name} Bodega`,
            address: { address_1: "Por definir", country_code: "co" },
          },
        ],
      },
    })
    stockLocationId = result[0].id

    const salesChannels = container.resolve(Modules.SALES_CHANNEL)
    const channels = await salesChannels.listSalesChannels({}, { take: 1 })
    if (channels[0]) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocationId, add: [channels[0].id] },
      })
    }
    await catalogo.updateVendorProfiles({
      id: profile.id,
      stock_location_id: stockLocationId,
    })
  }

  return {
    memberId,
    shippingProfileId,
    stockLocationId,
    currencyCode: seller.currency_code,
  }
}
