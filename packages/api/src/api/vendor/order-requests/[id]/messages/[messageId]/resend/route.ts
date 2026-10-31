import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resendMessage } from "../../../../../../../lib/orders"
import { CATALOGO_MODULE } from "../../../../../../../modules/catalogo"
import type CatalogoModuleService from "../../../../../../../modules/catalogo/service"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [order] = await catalogo.listOrderRequests(
    { id: req.params.id, seller_id: (req as any).seller_context.seller_id },
    { relations: ["messages"] }
  )
  if (!order?.messages.some((message) => message.id === req.params.messageId)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Mensaje no encontrado")
  }
  await resendMessage(req.scope, req.params.messageId)
  res.status(202).json({ id: req.params.messageId, status: "queued" })
}
