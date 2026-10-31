import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resendMessage } from "../../../../../lib/orders"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await resendMessage(req.scope, req.params.id)
  res.status(202).json({ id: req.params.id, status: "queued" })
}
