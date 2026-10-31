import { model } from "@medusajs/framework/utils"
import OrderRequestItem from "./order-request-item"
import WhatsappMessage from "./whatsapp-message"

export const ORDER_STATUSES = [
  "pendiente_confirmacion",
  "confirmado",
  "entregado",
  "cancelado",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

const OrderRequest = model
  .define("order_request", {
    id: model.id({ prefix: "oreq" }).primaryKey(),
    display_id: model.autoincrement(),
    seller_id: model.text(),
    status: model.enum([...ORDER_STATUSES]).default("pendiente_confirmacion"),
    customer_name: model.text(),
    customer_phone: model.text(),
    customer_address: model.text().nullable(),
    notes: model.text().nullable(),
    currency_code: model.text(),
    total: model.bigNumber(),
    idempotency_key: model.text(),
    items: model.hasMany(() => OrderRequestItem, { mappedBy: "order" }),
    messages: model.hasMany(() => WhatsappMessage, { mappedBy: "order" }),
  })
  .cascades({ delete: ["items", "messages"] })
  .indexes([
    { on: ["seller_id", "status"] },
    { on: ["customer_phone", "created_at"] },
    {
      on: ["seller_id", "idempotency_key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default OrderRequest
