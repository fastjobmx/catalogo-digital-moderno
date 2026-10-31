import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { parseOrThrow, z } from "../../../lib/validation"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import { ORDER_STATUSES } from "../../../modules/catalogo/models/order-request"
import type CatalogoModuleService from "../../../modules/catalogo/service"

const querySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { status, offset, limit } = parseOrThrow(querySchema, req.query)
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [orders, count] = await catalogo.listAndCountOrderRequests(
    {
      seller_id: (req as any).seller_context.seller_id,
      ...(status ? { status } : {}),
    },
    {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
      relations: ["items", "messages"],
    }
  )
  res.json({ orders, count, offset, limit })
}
