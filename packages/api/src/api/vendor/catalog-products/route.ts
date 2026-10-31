import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getVendorCatalog } from "../../../lib/vendor-catalog"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { catalog, currency_code } = await getVendorCatalog(req)
  res.json({ products: catalog, currency_code })
}
