import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { changeOrderStatus } from "../../../../lib/orders"
import { parseOrThrow, z } from "../../../../lib/validation"
import { CATALOGO_MODULE } from "../../../../modules/catalogo"
import { ORDER_STATUSES } from "../../../../modules/catalogo/models/order-request"
import type CatalogoModuleService from "../../../../modules/catalogo/service"

const bodySchema = z.object({ status: z.enum(ORDER_STATUSES) })

async function findOwnOrder(req: AuthenticatedMedusaRequest) {
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [order] = await catalogo.listOrderRequests(
    { id: req.params.id, seller_id: (req as any).seller_context.seller_id },
    { relations: ["items", "messages"] }
  )
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pedido no encontrado")
  }
  return order
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ order: await findOwnOrder(req) })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { status } = parseOrThrow(bodySchema, req.body)
  const order = await findOwnOrder(req)
  await changeOrderStatus(req.scope, order.id, status)
  res.json({ order: await findOwnOrder(req) })
}
