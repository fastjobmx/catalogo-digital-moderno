import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"

export type ProductOption = { name: string; values: string[] }

export type CatalogItem = {
  offer_id: string
  product_id: string
  sku: string
  title: string
  description: string | null
  image_url: string | null
  images: string[]
  category: string | null
  subcategory: string | null
  brand: string | null
  sizes: string[]
  options: ProductOption[]
  sold_out_options: string[]
  notice: string | null
  blur: string[]
  price: number
  compare_at_price: number | null
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  stock: number
}

const CACHE_TTL_MS = 60_000
const MAX_ITEMS = 5000

const cache = new Map<string, { expires: number; items: CatalogItem[] }>()

export function invalidateCatalog(sellerId: string) {
  cache.delete(sellerId)
}

/** Catálogo publicado del proveedor, con caché corta en memoria por proceso. */
export async function getSellerCatalog(
  container: MedusaContainer,
  sellerId: string,
  currencyCode: string
): Promise<CatalogItem[]> {
  const cached = cache.get(sellerId)
  if (cached && cached.expires > Date.now()) {
    return cached.items
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: offers } = await query.graph({
    entity: "offer",
    fields: [
      "id",
      "sku",
      "product_id",
      "prices.amount",
      "prices.currency_code",
      "inventory_item_link.inventory_item.location_levels.stocked_quantity",
    ],
    filters: { seller_id: sellerId },
    pagination: { take: MAX_ITEMS, order: { created_at: "DESC" } },
  })

  const productIds = offers.map((offer: any) => offer.product_id)
  const { data: products } = productIds.length
    ? await query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "description",
          "thumbnail",
          "status",
          "metadata",
          "images.url",
        ],
        filters: { id: productIds, status: ProductStatus.PUBLISHED },
        pagination: { take: MAX_ITEMS },
      })
    : { data: [] as any[] }
  const productById = new Map((products as any[]).map((p) => [p.id, p]))

  const items = offers.flatMap((offer: any): CatalogItem[] => {
    const product: any = productById.get(offer.product_id)
    const price = offer.prices?.find(
      (p: any) => p?.currency_code === currencyCode
    )
    if (!product || !price) {
      return []
    }
    const stock = (offer.inventory_item_link ?? [])
      .flatMap((link: any) => link?.inventory_item?.location_levels ?? [])
      .reduce((sum: number, level: any) => sum + Number(level?.stocked_quantity ?? 0), 0)
    const sizes = (product.metadata?.sizes as string[]) ?? []

    return [
      {
        offer_id: offer.id,
        product_id: offer.product_id,
        sku: offer.sku,
        title: product.title,
        description: product.description ?? null,
        image_url: product.thumbnail ?? null,
        images: (product.images ?? []).map((image: any) => image.url),
        category: (product.metadata?.category as string) ?? null,
        subcategory: (product.metadata?.subcategory as string) ?? null,
        brand: (product.metadata?.brand as string) ?? null,
        sizes,
        options: (product.metadata?.options as ProductOption[]) ?? (
          sizes.length ? [{ name: "Talla", values: sizes }] : []
        ),
        sold_out_options: (product.metadata?.sold_out_options as string[]) ?? [],
        notice: (product.metadata?.notice as string) ?? null,
        blur: (product.metadata?.blur as string[]) ?? [],
        price: Number(price.amount),
        compare_at_price: (product.metadata?.compare_at_price as number) ?? null,
        is_featured: Boolean(product.metadata?.is_featured),
        is_new: Boolean(product.metadata?.is_new),
        is_best_seller: Boolean(product.metadata?.is_best_seller),
        stock,
      },
    ]
  })

  // Destacados primero y agotados al final; el resto conserva el orden por fecha.
  const rank = (item: CatalogItem) => (item.stock <= 0 ? 2 : item.is_featured ? 0 : 1)
  items.sort((a, b) => rank(a) - rank(b))

  cache.set(sellerId, { expires: Date.now() + CACHE_TTL_MS, items })
  return items
}
