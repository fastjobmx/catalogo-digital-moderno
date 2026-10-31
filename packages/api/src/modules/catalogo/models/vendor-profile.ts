import { model } from "@medusajs/framework/utils"

// Marca blanca del proveedor. Nombre, slug (handle) y logo viven en el Seller de Mercur.
const VendorProfile = model
  .define("vendor_profile", {
    id: model.id({ prefix: "vprof" }).primaryKey(),
    seller_id: model.text(),
    primary_color: model.text().default("#111827"),
    secondary_color: model.text().default("#F59E0B"),
    whatsapp_phone: model.text().nullable(),
    stock_location_id: model.text().nullable(),
    payment_methods: model.json().default({ items: [] }),
    rubro: model.text().nullable(),
    city: model.text().nullable(),
    instagram: model.text().nullable(),
    business_hours: model.text().nullable(),
    delivery_time: model.text().nullable(),
    image_ratio: model.text().default("1:1"),
    banner_blur: model.text().nullable(),
  })
  .indexes([{ on: ["seller_id"], unique: true, where: "deleted_at IS NULL" }])

export default VendorProfile
