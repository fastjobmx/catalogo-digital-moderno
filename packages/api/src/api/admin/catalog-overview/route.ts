import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

/** Vista global: proveedores con sus ventas y comisión, y pedidos recientes. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const percent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 0)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name", "handle", "status", "currency_code"],
  })
  const orders = await catalogo.listOrderRequests(
    {},
    {
      take: 200,
      order: { created_at: "DESC" },
      relations: ["items", "messages"],
    }
  )
  // Los totales cuentan todo el histórico, no solo los pedidos que se muestran.
  const billable = await catalogo.listOrderRequests(
    { status: ["pendiente_confirmacion", "confirmado", "entregado"] },
    { select: ["seller_id", "total"], take: null }
  )

  const totals = new Map<string, { orders: number; sales: number }>()
  for (const order of billable) {
    const entry = totals.get(order.seller_id) ?? { orders: 0, sales: 0 }
    entry.orders += 1
    entry.sales += Number(order.total)
    totals.set(order.seller_id, entry)
  }

  res.json({
    commission_percent: percent,
    vendors: sellers.map((seller: any) => {
      const entry = totals.get(seller.id) ?? { orders: 0, sales: 0 }
      return {
        ...seller,
        ...entry,
        commission: Math.round((entry.sales * percent) / 100),
      }
    }),
    orders,
  })
}
