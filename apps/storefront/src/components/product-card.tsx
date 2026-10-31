"use client"

import { useState } from "react"
import type { Product } from "@/lib/api"
import { cn, formatMoney } from "@/lib/utils"
import { useCart } from "./cart-context"
import { QuantityStepper } from "./quantity-stepper"
import { Button } from "./ui/button"
import { Sheet } from "./ui/sheet"

type Props = {
  product: Product
  currencyCode: string
  canOrder: boolean
}

export function ProductCard({ product, currencyCode, canOrder }: Props) {
  const { add } = useCart()
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const soldOut = product.stock <= 0
  const gallery = product.images.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : []
  const discount = product.compare_at_price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0
  const needsSize = product.sizes.length > 0 && !size

  const confirm = () => {
    add(
      {
        offer_id: product.offer_id,
        title: product.title,
        image_url: product.image_url,
        price: product.price,
        stock: product.stock,
        size,
      },
      quantity
    )
    setOpen(false)
    setSize(null)
    setQuantity(1)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left"
      >
        {(product.is_featured || discount > 0) && !soldOut && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            {discount > 0 ? `-${discount}%` : "Destacado"}
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url ?? undefined}
          alt=""
          loading="lazy"
          className={cn("aspect-square w-full bg-line object-cover", soldOut && "opacity-50")}
        />
        <span className="flex flex-1 flex-col gap-1 p-3">
          {product.brand && (
            <span className="text-xs text-muted">{product.brand}</span>
          )}
          <span className="line-clamp-2 text-sm leading-snug font-medium">
            {product.title}
          </span>
          <span className="mt-auto text-[15px] font-semibold">
            {formatMoney(product.price, currencyCode)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-muted line-through">
              {formatMoney(product.compare_at_price as number, currencyCode)}
            </span>
          )}
          {soldOut && <span className="text-xs text-danger">Agotado</span>}
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen} title={product.title}>
        <div className="space-y-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[imageIndex]}
            alt={product.title}
            className="mx-auto aspect-square w-full max-w-64 rounded-xl bg-line object-cover"
          />
          {gallery.length > 1 && (
            <div className="flex justify-center gap-2">
              {gallery.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-pressed={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    "size-12 overflow-hidden rounded-lg border-2",
                    index === imageIndex ? "border-brand" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">
              {formatMoney(product.price, currencyCode)}
              {discount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted line-through">
                  {formatMoney(product.compare_at_price as number, currencyCode)}
                </span>
              )}
            </p>
            <p className="text-xs text-muted">Ref. {product.sku}</p>
          </div>
          {product.description && (
            <p className="text-sm text-muted">{product.description}</p>
          )}

          {product.sizes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Talla</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={size === option}
                    onClick={() => setSize(option)}
                    className={cn(
                      "min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium",
                      size === option
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-line bg-surface"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {soldOut ? (
            <p className="text-sm font-medium text-danger">Producto agotado</p>
          ) : canOrder ? (
            <div className="flex items-center gap-3">
              <QuantityStepper
                value={quantity}
                max={product.stock}
                label={product.title}
                onChange={setQuantity}
              />
              <Button className="flex-1" disabled={needsSize} onClick={confirm}>
                {needsSize ? "Elige una talla" : "Agregar"}
              </Button>
            </div>
          ) : null}
        </div>
      </Sheet>
    </>
  )
}
