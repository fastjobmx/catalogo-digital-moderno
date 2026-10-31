import { model } from "@medusajs/framework/utils"
import OrderRequest from "./order-request"

// Copia título y precio: el pedido no cambia si luego se reimporta el catálogo.
const OrderRequestItem = model.define("order_request_item", {
  id: model.id({ prefix: "oitem" }).primaryKey(),
  offer_id: model.text(),
  product_id: model.text(),
  sku: model.text(),
  title: model.text(),
  size: model.text().nullable(),
  image_url: model.text().nullable(),
  quantity: model.number(),
  unit_price: model.bigNumber(),
  line_total: model.bigNumber(),
  order: model.belongsTo(() => OrderRequest, { mappedBy: "items" }),
})

export default OrderRequestItem
