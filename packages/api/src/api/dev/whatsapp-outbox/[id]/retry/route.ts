import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { blockInProduction } from "../../../../../lib/dev-only"
import { resendMessage } from "../../../../../lib/orders"
import { CATALOGO_MODULE } from "../../../../../modules/catalogo"
import type CatalogoModuleService from "../../../../../modules/catalogo/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (blockInProduction(res)) {
    return
  }
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const entry = await catalogo.retrieveWhatsappOutbox(req.params.id)
  await resendMessage(req.scope, entry.message_id)
  res.status(202).json({ id: entry.id, status: "queued" })
}
