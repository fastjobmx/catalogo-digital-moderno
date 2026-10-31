import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { countExistingSkus } from "../../../lib/catalog-import"
import { validateRows } from "../../../lib/import-rows"
import { parseOrThrow, z } from "../../../lib/validation"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

const MAX_ROWS = 20_000

const cell = z.union([z.string(), z.number()]).nullish()
const bodySchema = z.object({
  file_name: z.string().trim().min(1).max(200),
  rows: z
    .array(
      z.object({
        sku: cell,
        title: cell,
        description: cell,
        price: cell,
        stock: cell,
        image_url: cell,
        images: cell,
        category: cell,
        brand: cell,
        compare_at_price: cell,
        is_featured: cell,
        sizes: cell,
      })
    )
    .min(1, "El archivo no tiene filas")
    .max(MAX_ROWS, `Máximo ${MAX_ROWS} filas por archivo`),
})

/** Paso de previsualización: valida y guarda el borrador, sin tocar el catálogo. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = parseOrThrow(bodySchema, req.body)
  const sellerId = (req as any).seller_context.seller_id as string
  const { valid, errors } = validateRows(body.rows)
  const updates = await countExistingSkus(
    req.scope,
    sellerId,
    valid.map((row) => row.sku)
  )

  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const job = await catalogo.createCatalogImports({
    seller_id: sellerId,
    file_name: body.file_name,
    total_rows: valid.length,
    failed_count: errors.length,
    rows: { items: valid },
    errors: { items: errors },
  } as any)

  res.status(201).json({
    import: {
      id: job.id,
      total_rows: body.rows.length,
      valid_rows: valid.length,
      invalid_rows: errors.length,
      to_create: valid.length - updates,
      to_update: updates,
      sample: valid.slice(0, 10),
      errors: errors.slice(0, 200),
    },
  })
}
