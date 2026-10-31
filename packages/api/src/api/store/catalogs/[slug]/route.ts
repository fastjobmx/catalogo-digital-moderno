import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CatalogItem, getSellerCatalog } from "../../../../lib/catalog-read"
import { getPublicSeller } from "../../../../lib/public-seller"
import { parseOrThrow, z } from "../../../../lib/validation"

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  // "Talla:40" o varios ejes separados por "|": "Talla:40|Color:Negro".
  options: z.string().trim().max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(24),
})

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

function facets(items: CatalogItem[]) {
  const options = new Map<string, Set<string>>()
  for (const item of items) {
    for (const option of item.options) {
      const values = options.get(option.name) ?? new Set<string>()
      option.values.forEach((value) => values.add(value))
      options.set(option.name, values)
    }
  }
  const prices = items.map((item) => item.price)
  return {
    brands: [...new Set(items.flatMap((i) => (i.brand ? [i.brand] : [])))].sort(),
    options: [...options].map(([name, values]) => ({ name, values: [...values] })),
    price: prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : null,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { q, category, brand, min_price, max_price, options, offset, limit } =
    parseOrThrow(querySchema, req.query)
  const { seller, ...profile } = await getPublicSeller(req.scope, req.params.slug)
  const catalog = await getSellerCatalog(req.scope, seller.id, seller.currency_code)

  const term = q ? normalize(q) : null
  const wanted = (options ?? "")
    .split("|")
    .filter(Boolean)
    .map((pair) => pair.split(":") as [string, string])
  const inCategory = category
    ? catalog.filter((item) => item.category === category)
    : catalog
  const filtered = inCategory.filter(
    (item) =>
      (!brand || item.brand === brand) &&
      (min_price === undefined || item.price >= min_price) &&
      (max_price === undefined || item.price <= max_price) &&
      wanted.every(([name, value]) =>
        item.options.some(
          (option) => option.name === name && option.values.includes(value)
        )
      ) &&
      (!term ||
        normalize(
          `${item.title} ${item.sku} ${item.brand ?? ""} ${item.category ?? ""}`
        ).includes(term))
  )

  res.json({
    vendor: {
      name: seller.name,
      slug: seller.handle,
      logo: seller.logo,
      banner: seller.banner,
      description: seller.description,
      currency_code: seller.currency_code,
      primary_color: profile.primary_color,
      secondary_color: profile.secondary_color,
      payment_methods: profile.payment_methods,
      accepts_orders: Boolean(profile.whatsapp_phone),
      whatsapp_phone: profile.whatsapp_phone,
      rubro: profile.rubro,
      city: profile.city,
      instagram: profile.instagram,
      business_hours: profile.business_hours,
      delivery_time: profile.delivery_time,
      image_ratio: profile.image_ratio,
      banner_blur: profile.banner_blur,
    },
    categories: [
      ...new Set(catalog.flatMap((item) => (item.category ? [item.category] : []))),
    ].sort(),
    facets: facets(inCategory),
    products: filtered.slice(offset, offset + limit),
    count: filtered.length,
    offset,
    limit,
  })
}
