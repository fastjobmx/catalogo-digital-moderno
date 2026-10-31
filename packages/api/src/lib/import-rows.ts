import { z } from "./validation"

/** Fila ya mapeada por el navegador; los valores llegan como texto de Excel/CSV. */
export type RawImportRow = Record<string, string | number | null | undefined>

export type ImportRow = {
  sku: string
  title: string
  description: string | null
  price: number
  stock: number | null
  image_url: string | null
  images: string[]
  category: string | null
  brand: string | null
  sizes: string[]
  compare_at_price: number | null
  is_featured: boolean | null
  /** Solo lo llena el seed: variantes, avisos y blur. El CSV no puede escribirlo. */
  extra?: Record<string, unknown>
}

export type RowError = { row: number; sku?: string; message: string }

/** Interpreta "$ 189.900", "189,900", "189900" y "189900,50". */
export function parsePrice(value: unknown): number {
  if (typeof value === "number") {
    return value
  }
  const text = String(value ?? "").replace(/[^\d.,-]/g, "")
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) {
    return Number(text.replace(/[.,]/g, ""))
  }
  return Number(text.replace(/\./g, "").replace(",", "."))
}

function text(value: unknown): string {
  return String(value ?? "").trim()
}

const rowSchema = z.object({
  sku: z.string().min(1, "SKU requerido").max(64),
  title: z.string().min(1, "Nombre requerido").max(200),
  description: z.string().max(5000).nullable(),
  price: z.number().positive("Precio inválido"),
  stock: z.number().int("Stock debe ser entero").min(0, "Stock inválido").nullable(),
  image_url: z.string().url("URL de imagen inválida").nullable(),
  images: z.array(z.string().url("URL de imagen inválida")).max(10),
  category: z.string().max(80).nullable(),
  brand: z.string().max(80).nullable(),
  sizes: z.array(z.string().max(16)).max(40),
  compare_at_price: z.number().positive("Precio anterior inválido").nullable(),
  is_featured: z.boolean().nullable(),
})

function parseBoolean(value: unknown): boolean | null {
  const answer = text(value).toLowerCase()
  if (!answer) {
    return null
  }
  return ["1", "si", "sí", "true", "x"].includes(answer)
}

/** Valida todas las filas y separa las válidas de los errores por número de fila. */
export function validateRows(rows: RawImportRow[]) {
  const valid: ImportRow[] = []
  const errors: RowError[] = []
  const seen = new Set<string>()

  rows.forEach((raw, index) => {
    // +2: la fila 1 del archivo es el encabezado.
    const row = index + 2
    const parsed = rowSchema.safeParse({
      sku: text(raw.sku),
      title: text(raw.title),
      description: text(raw.description) || null,
      price: parsePrice(raw.price),
      stock: text(raw.stock) === "" ? null : Number(text(raw.stock).replace(/[.,]/g, "")),
      image_url: text(raw.image_url) || null,
      images: text(raw.images)
        .split("|")
        .map((url) => url.trim())
        .filter(Boolean),
      category: text(raw.category) || null,
      brand: text(raw.brand) || null,
      compare_at_price: text(raw.compare_at_price)
        ? parsePrice(raw.compare_at_price)
        : null,
      is_featured: parseBoolean(raw.is_featured),
      sizes: text(raw.sizes)
        .split(/[|,;/]/)
        .map((size) => size.trim())
        .filter(Boolean),
    })

    if (!parsed.success) {
      errors.push({
        row,
        sku: text(raw.sku) || undefined,
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      })
      return
    }
    if (
      parsed.data.compare_at_price !== null &&
      parsed.data.compare_at_price <= parsed.data.price
    ) {
      errors.push({
        row,
        sku: parsed.data.sku,
        message: "El precio anterior debe ser mayor que el precio",
      })
      return
    }
    if (seen.has(parsed.data.sku)) {
      errors.push({
        row,
        sku: parsed.data.sku,
        message: "SKU repetido en el archivo",
      })
      return
    }
    seen.add(parsed.data.sku)
    valid.push(parsed.data)
  })

  return { valid, errors }
}
