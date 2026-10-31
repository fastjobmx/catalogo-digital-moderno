import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getVendorCatalog } from "../../../lib/vendor-catalog"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

const LOW_STOCK = 5
const BOGOTA_OFFSET_MS = 5 * 3_600_000

// Colombia no tiene horario de verano: el día comercial empieza a las 5:00 UTC.
function startOfBogotaDay() {
  const local = new Date(Date.now() - BOGOTA_OFFSET_MS)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() + BOGOTA_OFFSET_MS)
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { sellerId, catalog, currency_code } = await getVendorCatalog(req)
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const today = await catalogo.listOrderRequests(
    {
      seller_id: sellerId,
      created_at: { $gte: startOfBogotaDay() },
      status: ["pendiente_confirmacion", "confirmado", "entregado"],
    },
    { select: ["total"], take: null }
  )
  const recent = await catalogo.listOrderRequests(
    { seller_id: sellerId },
    { take: 6, order: { created_at: "DESC" } }
  )

  res.json({
    currency_code,
    orders_today: today.length,
    sales_today: today.reduce((sum, order) => sum + Number(order.total), 0),
    low_stock: catalog.filter((i) => i.stock > 0 && i.stock <= LOW_STOCK).length,
    sold_out: catalog.filter((i) => i.stock <= 0).length,
    products: catalog.length,
    recent_orders: recent,
  })
}
