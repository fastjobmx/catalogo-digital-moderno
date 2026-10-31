import Link from "next/link"
import type { Product, Vendor } from "@/lib/api"
import { cn, discountPercent, formatMoney } from "@/lib/utils"
import { ProductImage } from "./product-image"
import { Badge } from "./ui/badge"

type TileProps = {
  product: Product
  vendor: Vendor
  label: string
  large?: boolean
}

function Tile({ product, vendor, label, large }: TileProps) {
  const discount =
    label === "Oferta" ? discountPercent(product.price, product.compare_at_price) : 0
  return (
    <Link
      href={`/${vendor.slug}/p/${encodeURIComponent(product.sku)}`}
      className={cn(
        "group relative block overflow-hidden rounded-card bg-photo shadow-card transition-shadow duration-200 hover:shadow-card-hover",
        large && "col-span-2 row-span-2"
      )}
    >
      <ProductImage
        src={product.image_url}
        blur={product.blur[0]}
        alt=""
        ratio="1:1"
        sizes={large ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
        priority={large}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
        <p className={cn("line-clamp-2 font-bold", large ? "text-lg leading-6" : "text-sm leading-5")}>
          {product.title}
        </p>
        <p className="text-sm font-bold tabular-nums">
          {formatMoney(product.price, vendor.currency_code)}
        </p>
      </div>
      <div className="absolute top-2 left-2">
        <Badge tone={discount > 0 ? "danger" : "accent"}>
          {discount > 0 ? `${label} -${discount}%` : label}
        </Badge>
      </div>
    </Link>
  )
}

export function BentoGrid({ vendor, products }: { vendor: Vendor; products: Product[] }) {
  const available = products.filter((product) => product.stock > 0)
  const featured = available.find((product) => product.is_featured)
  if (!featured) {
    return null
  }
  // Cada bloque muestra un producto distinto, aunque uno cumpla varias condiciones.
  const used = new Set([featured.sku])
  const pick = (matches: (product: Product) => unknown) => {
    const found = available.find((product) => !used.has(product.sku) && matches(product))
    if (found) {
      used.add(found.sku)
    }
    return found
  }
  const offer = pick((product) => product.compare_at_price)
  const fresh = pick((product) => product.is_new)
  const popular = pick((product) => product.is_best_seller)

  return (
    <section aria-label="Destacados" className="mb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Tile product={featured} vendor={vendor} label="Destacado" large />
        {offer && <Tile product={offer} vendor={vendor} label="Oferta" />}
        {fresh && <Tile product={fresh} vendor={vendor} label="Nuevo" />}
        {popular && <Tile product={popular} vendor={vendor} label="Más pedido" />}
        <div className="flex flex-col justify-between gap-2 rounded-card bg-accent p-4 text-accent-foreground shadow-card">
          <p className="text-lg leading-6 font-extrabold">
            {vendor.delivery_time ?? "Pide por WhatsApp"}
          </p>
          <p className="text-sm">Escríbenos y te ayudamos con tu pedido.</p>
        </div>
      </div>
    </section>
  )
}
