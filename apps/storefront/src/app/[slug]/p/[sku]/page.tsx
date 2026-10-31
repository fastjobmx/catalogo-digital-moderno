import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductGallery } from "@/components/product-gallery"
import { ProductPurchase } from "@/components/product-purchase"
import { Badge } from "@/components/ui/badge"
import { getCatalog, getProduct } from "@/lib/api"

type Props = { params: Promise<{ slug: string; sku: string }> }

export default async function ProductPage({ params }: Props) {
  const { slug, sku } = await params
  const [detail, catalog] = await Promise.all([
    getProduct(slug, decodeURIComponent(sku)),
    getCatalog(slug, { limit: 1 }),
  ])
  if (!detail || !catalog) {
    notFound()
  }
  const { product, related } = detail
  const { vendor } = catalog

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-32 md:pb-16">
      <Link
        href={`/${vendor.slug}`}
        className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Volver al catálogo
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery product={product} ratio={vendor.image_ratio} />

        <div>
          {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
          <h1 className="mt-1 text-2xl leading-tight md:text-3xl">{product.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.is_new && <Badge tone="accent">Nuevo</Badge>}
            {product.is_best_seller && <Badge tone="neutral">Más pedido</Badge>}
            {product.category && <Badge tone="neutral">{product.category}</Badge>}
          </div>
          <ProductPurchase product={product} vendor={vendor} />
          {product.description && (
            <div className="mt-6 border-t border-line pt-4">
              <h2 className="text-base">Descripción</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                {product.description}
              </p>
            </div>
          )}
          {vendor.delivery_time && (
            <p className="mt-3 text-sm text-muted">{vendor.delivery_time}</p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg">También te puede gustar</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((item) => (
              <li key={item.offer_id}>
                <ProductCard product={item} vendor={vendor} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
