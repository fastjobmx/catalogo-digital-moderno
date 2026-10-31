import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getSellerCatalog } from "../../../../../../lib/catalog-read"
import { getPublicSeller } from "../../../../../../lib/public-seller"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { seller } = await getPublicSeller(req.scope, req.params.slug)
  const catalog = await getSellerCatalog(req.scope, seller.id, seller.currency_code)
  const product = catalog.find((item) => item.sku === req.params.sku)
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Producto no encontrado")
  }
  const related = catalog
    .filter(
      (item) =>
        item.category === product.category &&
        item.sku !== product.sku &&
        item.stock > 0
    )
    .slice(0, 4)
  res.json({ product, related })
}
