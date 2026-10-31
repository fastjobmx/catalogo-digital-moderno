import { model } from "@medusajs/framework/utils"

// Registro de lo que el MockProvider "envió". message_id permite reencolar desde la página de desarrollo.
const WhatsappOutbox = model
  .define("whatsapp_outbox", {
    id: model.id({ prefix: "waout" }).primaryKey(),
    message_id: model.text(),
    to: model.text(),
    template: model.text(),
    payload: model.json(),
    status: model.enum(["sent", "failed"]),
    error: model.text().nullable(),
  })
  .indexes([{ on: ["to"] }, { on: ["message_id"] }])

export default WhatsappOutbox
