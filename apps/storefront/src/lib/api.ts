import "server-only"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export type PaymentMethod = { name: string; detail?: string }

export type Vendor = {
  name: string
  slug: string
  logo: string | null
  description: string | null
  currency_code: string
  primary_color: string
  secondary_color: string
  payment_methods: PaymentMethod[]
  accepts_orders: boolean
}

export type Product = {
  offer_id: string
  sku: string
  title: string
  description: string | null
  image_url: string | null
  images: string[]
  category: string | null
  brand: string | null
  sizes: string[]
  price: number
  compare_at_price: number | null
  is_featured: boolean
  stock: number
}

export type Catalog = {
  vendor: Vendor
  categories: string[]
  products: Product[]
  count: number
  offset: number
  limit: number
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

export async function getCatalog(
  slug: string,
  params: { q?: string; category?: string; offset?: number; limit?: number }
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
  return response.json()
}
