import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { blockInProduction } from "../../../lib/dev-only"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (blockInProduction(res)) {
    return
  }
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [messages, count] = await catalogo.listAndCountWhatsappOutboxes(
    {},
    { order: { created_at: "DESC" }, take: 200 }
  )
  res.json({ messages, count })
}
