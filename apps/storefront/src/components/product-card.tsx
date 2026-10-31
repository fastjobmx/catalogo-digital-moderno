import Link from "next/link"
import { MessageCircle } from "lucide-react"
import type { Product, Vendor } from "@/lib/api"
import { cn, discountPercent, whatsappLink } from "@/lib/utils"
import { PriceTag } from "./price-tag"
import { ProductImage } from "./product-image"
import { Badge } from "./ui/badge"
import { buttonVariants } from "./ui/button"

const CARD_SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"

export function ProductCard({ product, vendor }: { product: Product; vendor: Vendor }) {
  const href = `/${vendor.slug}/p/${encodeURIComponent(product.sku)}`
  const soldOut = product.stock <= 0
  const discount = discountPercent(product.price, product.compare_at_price)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow duration-200 ease-in-out hover:shadow-card-hover">
      <Link href={href} aria-label={product.title}>
        <ProductImage
          src={product.image_url}
          blur={product.blur[0]}
          alt=""
          ratio={vendor.image_ratio}
          sizes={CARD_SIZES}
          grayscale={soldOut}
        />
      </Link>

      <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
        {soldOut ? (
          <Badge tone="dark">Agotado</Badge>
        ) : (
          <>
            {discount > 0 && <Badge tone="danger">-{discount}%</Badge>}
            {product.is_new && <Badge tone="accent">Nuevo</Badge>}
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold tracking-normal">
          <Link href={href}>{product.title}</Link>
        </h3>
        <div className="mt-auto pt-1">
          <PriceTag
            price={product.price}
            compareAt={product.compare_at_price}
            currencyCode={vendor.currency_code}
          />
        </div>

        {soldOut ? (
          vendor.whatsapp_phone && (
            <a
              href={whatsappLink(
                vendor.whatsapp_phone,
                `Hola, avísenme cuando llegue ${product.title} (${product.sku}).`
              )}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "small" }),
                "mt-2 w-full px-2 text-xs"
              )}
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden />
              Avisarme por WhatsApp
            </a>
          )
        ) : (
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: "primary", size: "small" }),
              "mt-2 w-full lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
            )}
          >
            Añadir
          </Link>
        )}
      </div>
    </article>
  )
}
