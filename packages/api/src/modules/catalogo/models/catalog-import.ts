import { model } from "@medusajs/framework/utils"

const CatalogImport = model
  .define("catalog_import", {
    id: model.id({ prefix: "cimp" }).primaryKey(),
    seller_id: model.text(),
    file_name: model.text(),
    status: model
      .enum(["preview", "queued", "processing", "completed", "failed"])
      .default("preview"),
    rows: model.json().default({ items: [] }),
    total_rows: model.number().default(0),
    processed_rows: model.number().default(0),
    created_count: model.number().default(0),
    updated_count: model.number().default(0),
    failed_count: model.number().default(0),
    errors: model.json().default({ items: [] }),
  })
  .indexes([{ on: ["seller_id"] }])

export default CatalogImport
