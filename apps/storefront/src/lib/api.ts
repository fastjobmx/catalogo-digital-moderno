import "server-only"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export type PaymentMethod = { name: string; detail?: string }

export type Vendor = {
  name: string
  slug: string
  logo: string | null
  banner: string | null
  banner_blur: string | null
  description: string | null
  currency_code: string
  primary_color: string
  secondary_color: string
  payment_methods: PaymentMethod[]
  accepts_orders: boolean
  whatsapp_phone: string | null
  rubro: string | null
  city: string | null
  instagram: string | null
  business_hours: string | null
  delivery_time: string | null
  image_ratio: string
}

export type ProductOption = { name: string; values: string[] }

export type Product = {
  offer_id: string
  sku: string
  title: string
  description: string | null
  image_url: string | null
  images: string[]
  blur: string[]
  category: string | null
  subcategory: string | null
  brand: string | null
  sizes: string[]
  options: ProductOption[]
  sold_out_options: string[]
  notice: string | null
  price: number
  compare_at_price: number | null
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  stock: number
}

export type Facets = {
  brands: string[]
  options: ProductOption[]
  price: { min: number; max: number } | null
}

export type Catalog = {
  vendor: Vendor
  categories: string[]
  facets: Facets
  products: Product[]
  count: number
  offset: number
  limit: number
}

const ASSET_ORIGIN = process.env.SEED_ASSET_BASE_URL || "http://localhost:3100"

// Las fotos del seed se guardan con URL absoluta; relativas funcionan en cualquier dominio.
async function readJson<T>(response: Response): Promise<T> {
  return JSON.parse((await response.text()).replaceAll(ASSET_ORIGIN, ""))
}

export function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": process.env.MEDUSA_PUBLISHABLE_KEY ?? "",
      ...init?.headers,
    },
  })
}

export type CatalogParams = {
  q?: string
  category?: string
  brand?: string
  min_price?: string
  max_price?: string
  options?: string
  offset?: number
  limit?: number
}

export async function getCatalog(
  slug: string,
  params: CatalogParams
): Promise<Catalog | null> {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  })

  const response = await backendFetch(
    `/store/catalogs/${encodeURIComponent(slug)}?${search}`,
    // El backend ya cachea productos; aquí la marca debe verse apenas el proveedor la cambie.
    { cache: "no-store" }
  )
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Catálogo: HTTP ${response.status}`)
  }
  return readJson<Catalog>(response)
}

export async function getProduct(slug: string, sku: string) {
  const response = await backendFetch(
    `/store/catalogs/${encodeURIComponent(slug)}/products/${encodeURIComponent(sku)}`,
    { cache: "no-store" }
  )
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Producto: HTTP ${response.status}`)
  }
  return readJson<{ product: Product; related: Product[] }>(response)
}
