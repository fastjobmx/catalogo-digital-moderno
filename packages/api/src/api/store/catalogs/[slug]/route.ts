import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSellerCatalog } from "../../../../lib/catalog-read"
import { getPublicSeller } from "../../../../lib/public-seller"
import { parseOrThrow, z } from "../../../../lib/validation"

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(24),
})

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { q, category, offset, limit } = parseOrThrow(querySchema, req.query)
  const { seller, ...brand } = await getPublicSeller(req.scope, req.params.slug)
  const catalog = await getSellerCatalog(req.scope, seller.id, seller.currency_code)

  const term = q ? normalize(q) : null
  const filtered = catalog.filter(
    (item) =>
      (!category || item.category === category) &&
      (!term ||
        normalize(`${item.title} ${item.sku} ${item.category ?? ""}`).includes(term))
  )

  res.json({
    vendor: {
      name: seller.name,
      slug: seller.handle,
      logo: seller.logo,
      description: seller.description,
      currency_code: seller.currency_code,
      primary_color: brand.primary_color,
      secondary_color: brand.secondary_color,
      payment_methods: brand.payment_methods,
      accepts_orders: Boolean(brand.whatsapp_phone),
    },
    categories: [
      ...new Set(catalog.flatMap((item) => (item.category ? [item.category] : []))),
    ].sort(),
    products: filtered.slice(offset, offset + limit),
    count: filtered.length,
    offset,
    limit,
  })
}
