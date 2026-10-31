import { BentoGrid } from "@/components/bento-grid"
import { CategoryChips } from "@/components/category-chips"
import { EmptyState } from "@/components/empty-state"
import { FilterPanel, FilterSheet } from "@/components/filter-sheet"
import { LoadMore } from "@/components/load-more"
import { ProductCard } from "@/components/product-card"
import { StoreProfile } from "@/components/store-profile"
import { getCatalog } from "@/lib/api"
import { notFound } from "next/navigation"

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { q, categoria, marca, min, max, op, limite } = await searchParams
  const limit = Math.min(Number(limite) || PAGE_SIZE, 100)
  const catalog = await getCatalog(slug, {
    q,
    category: categoria,
    brand: marca,
    min_price: min,
    max_price: max,
    options: op,
    limit,
  })
  if (!catalog) {
    notFound()
  }

  const { vendor, categories, facets, products, count } = catalog
  const filtering = Boolean(q || categoria || marca || min || max || op)
  const home = filtering ? null : await getCatalog(slug, { limit: 100 })

  return (
    <>
      {!filtering && <StoreProfile vendor={vendor} />}
      <CategoryChips categories={categories} />

      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-24">
        {!vendor.accepts_orders && (
          <p className="mb-3 rounded-xl border border-line bg-surface p-3 text-sm text-muted">
            Este comercio aún no recibe pedidos por aquí.
          </p>
        )}

        {home && <BentoGrid vendor={vendor} products={home.products} />}

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg">
            {filtering ? `${count} resultados` : "Todo el catálogo"}
          </h2>
          <FilterSheet facets={facets} />
        </div>

        <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-6">
          <aside className="hidden self-start rounded-card bg-surface p-4 shadow-card lg:sticky lg:top-32 lg:block">
            <FilterPanel facets={facets} />
          </aside>

          <div>
            {products.length ? (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                {products.map((product) => (
                  <li key={product.offer_id}>
                    <ProductCard product={product} vendor={vendor} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                kind="search"
                title="No encontramos productos"
                description="Prueba con otra palabra o quita algunos filtros."
              />
            )}
            {products.length < count && <LoadMore nextLimit={limit + PAGE_SIZE} />}
          </div>
        </div>
      </main>
    </>
  )
}
