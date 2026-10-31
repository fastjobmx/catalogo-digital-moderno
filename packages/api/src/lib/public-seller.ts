import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type CatalogoModuleService from "../modules/catalogo/service"
import type { PaymentMethod } from "./whatsapp/messages"

/** Resuelve un proveedor abierto por su slug, con su marca blanca. */
export async function getPublicSeller(container: MedusaContainer, slug: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: [
      "id",
      "name",
      "handle",
      "logo",
      "banner",
      "description",
      "currency_code",
      "status",
    ],
    filters: { handle: slug },
  })
  if (!seller || seller.status !== "open") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Catálogo no encontrado")
  }

  const [profile] = await catalogo.listVendorProfiles({ seller_id: seller.id })
  const payload = profile?.payment_methods as unknown as
    | { items: PaymentMethod[] }
    | undefined

  return {
    seller,
    primary_color: profile?.primary_color ?? "#111827",
    secondary_color: profile?.secondary_color ?? "#F59E0B",
    whatsapp_phone: profile?.whatsapp_phone ?? null,
    payment_methods: payload?.items ?? [],
    rubro: profile?.rubro ?? null,
    city: profile?.city ?? null,
    instagram: profile?.instagram ?? null,
    business_hours: profile?.business_hours ?? null,
    delivery_time: profile?.delivery_time ?? null,
    image_ratio: profile?.image_ratio ?? "1:1",
    banner_blur: profile?.banner_blur ?? null,
  }
}
