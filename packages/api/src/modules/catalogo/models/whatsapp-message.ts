import { model } from "@medusajs/framework/utils"
import OrderRequest from "./order-request"

export const MESSAGE_STATUSES = [
  "queued",
  "retrying",
  "sent",
  "delivered",
  "read",
  "failed",
] as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

const WhatsappMessage = model
  .define("whatsapp_message", {
    id: model.id({ prefix: "wamsg" }).primaryKey(),
    recipient: model.enum(["vendor", "customer"]),
    to_phone: model.text(),
    template: model.text(),
    params: model.json(),
    body: model.text(),
    status: model.enum([...MESSAGE_STATUSES]).default("queued"),
    provider: model.text().nullable(),
    provider_message_id: model.text().nullable(),
    attempts: model.number().default(0),
    last_error: model.text().nullable(),
    order: model.belongsTo(() => OrderRequest, { mappedBy: "messages" }),
  })
  .indexes([{ on: ["provider_message_id"] }, { on: ["status"] }])

export default WhatsappMessage
