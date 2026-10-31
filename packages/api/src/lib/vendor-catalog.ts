import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSellerCatalog } from "./catalog-read"

export async function getVendorCatalog(req: AuthenticatedMedusaRequest) {
  const sellerId = (req as any).seller_context.seller_id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: ["currency_code"],
    filters: { id: sellerId },
  })
  const catalog = await getSellerCatalog(req.scope, sellerId, seller.currency_code)
  return { sellerId, catalog, currency_code: seller.currency_code as string }
}
