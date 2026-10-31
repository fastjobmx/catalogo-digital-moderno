import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { blockInProduction } from "../../../lib/dev-only"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (blockInProduction(res)) {
    return
  }
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const outbox = await catalogo.listWhatsappOutboxes(
    {},
    { order: { created_at: "DESC" }, take: 300 }
  )
  const sent = await catalogo.listWhatsappMessages(
    { id: [...new Set(outbox.map((entry) => entry.message_id))] },
    { relations: ["order"], take: null }
  )
  const sellerByMessage = new Map(sent.map((m) => [m.id, m.order?.seller_id]))
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name"],
  })
  const nameById = new Map(sellers.map((s: any) => [s.id, s.name as string]))

  const messages = outbox
    .map((entry) => {
      const seller_id = sellerByMessage.get(entry.message_id) ?? null
      return { ...entry, seller_id, vendor: nameById.get(seller_id as string) ?? null }
    })
    .filter((entry) => !req.query.vendor || entry.seller_id === req.query.vendor)

  res.json({
    messages,
    count: messages.length,
    vendors: sellers.map((s: any) => ({ id: s.id, name: s.name })),
  })
}
