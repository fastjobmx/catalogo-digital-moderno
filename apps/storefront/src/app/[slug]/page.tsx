import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CartBar } from "@/components/cart-bar"
import { CartProvider } from "@/components/cart-context"
import { CatalogFilters } from "@/components/catalog-filters"
import { LoadMore } from "@/components/load-more"
import { ProductCard } from "@/components/product-card"
import { getCatalog } from "@/lib/api"
import { readableOn } from "@/lib/utils"

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; categoria?: string; limite?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const catalog = await getCatalog(slug, { limit: 1 })
  return catalog
    ? {
        title: `${catalog.vendor.name} | Catálogo`,
        description: catalog.vendor.description ?? undefined,
      }
    : { title: "Catálogo no disponible" }
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { q, categoria, limite } = await searchParams
  const limit = Math.min(Number(limite) || PAGE_SIZE, 100)
  const catalog = await getCatalog(slug, { q, category: categoria, limit })
  if (!catalog) {
    notFound()
  }

  const { vendor, categories, products, count } = catalog
  const theme = {
    "--brand": vendor.primary_color,
    "--brand-foreground": readableOn(vendor.primary_color),
    "--accent": vendor.secondary_color,
    "--accent-foreground": readableOn(vendor.secondary_color),
  } as CSSProperties

  return (
    <div style={theme} className="min-h-dvh pb-28">
      <CartProvider slug={vendor.slug}>
        <header className="bg-brand text-brand-foreground">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
            {vendor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.logo}
                alt=""
                className="size-12 rounded-xl bg-white object-contain"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-accent-foreground">
                {vendor.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{vendor.name}</h1>
              {vendor.description && (
                <p className="truncate text-sm opacity-80">{vendor.description}</p>
              )}
            </div>
          </div>
        </header>

        <CatalogFilters categories={categories} query={q} category={categoria} />

        <main className="mx-auto max-w-5xl px-4">
          {!vendor.accepts_orders && (
            <p className="mb-3 rounded-lg border border-line bg-surface p-3 text-sm text-muted">
              Este proveedor aún no recibe pedidos por aquí.
            </p>
          )}
          {products.length ? (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <li key={product.offer_id}>
                  <ProductCard
                    product={product}
                    currencyCode={vendor.currency_code}
                    canOrder={vendor.accepts_orders}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-muted">
              No encontramos productos con esa búsqueda.
            </p>
          )}
          {products.length < count && <LoadMore nextLimit={limit + PAGE_SIZE} />}
        </main>

        <CartBar vendor={vendor} />
      </CartProvider>
    </div>
  )
}
