"use client"

import { useState } from "react"
import { Clock, MessageCircle } from "lucide-react"
import type { Product, Vendor } from "@/lib/api"
import { discountPercent, whatsappLink } from "@/lib/utils"
import { useCart } from "./cart-context"
import { PriceTag } from "./price-tag"
import { QuantityStepper } from "./quantity-stepper"
import { Badge } from "./ui/badge"
import { Button, buttonVariants } from "./ui/button"
import { VariantSelector } from "./variant-selector"

export function ProductPurchase({ product, vendor }: { product: Product; vendor: Vendor }) {
  const { add, setOpen } = useCart()
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const soldOut = product.stock <= 0
  const missing = product.options.find((option) => !choice[option.name])
  const discount = discountPercent(product.price, product.compare_at_price)

  const addToCart = () => {
    add(
      {
        offer_id: product.offer_id,
        title: product.title,
        image_url: product.image_url,
        price: product.price,
        stock: product.stock,
        size: product.options.map((option) => choice[option.name]).join(" / ") || null,
      },
      quantity
    )
    setOpen(true)
  }

  const label = soldOut
    ? "Agotado"
    : missing
      ? `Elige ${missing.name.toLowerCase()}`
      : "Añadir al carrito"

  return (
    <>
      <div className="mt-4 flex items-center gap-2">
        <PriceTag
          price={product.price}
          compareAt={product.compare_at_price}
          currencyCode={vendor.currency_code}
          large
        />
        {discount > 0 && <Badge tone="danger">-{discount}%</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">Ref. {product.sku}</p>

      {product.notice && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-canvas p-2.5 text-sm font-medium ring-1 ring-line">
          <Clock className="size-4 shrink-0" aria-hidden />
          {product.notice}
        </p>
      )}

      <div className="mt-5">
        <VariantSelector
          options={product.options}
          soldOut={product.sold_out_options}
          value={choice}
          onChange={(name, value) =>
            setChoice((current) => ({ ...current, [name]: value }))
          }
        />
      </div>

      {!soldOut && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold">Cantidad</p>
          <QuantityStepper
            value={quantity}
            max={product.stock}
            label={product.title}
            onChange={setQuantity}
          />
        </div>
      )}

      <div className="mt-5 hidden gap-2 md:flex">
        <Button
          variant="accent"
          className="flex-1"
          disabled={soldOut || Boolean(missing) || !vendor.accepts_orders}
          onClick={addToCart}
        >
          {label}
        </Button>
      </div>

      {vendor.whatsapp_phone && (
        <a
          href={whatsappLink(
            vendor.whatsapp_phone,
            `Hola, quiero preguntar por ${product.title} (${product.sku}).`
          )}
          target="_blank"
          rel="noreferrer"
          className={`${buttonVariants({ variant: "outline" })} mt-2 w-full`}
        >
          <MessageCircle className="size-4" aria-hidden />
          Preguntar por WhatsApp
        </a>
      )}

      {/* Barra fija en móvil: precio y compra siempre al alcance del pulgar. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="shrink-0">
          <PriceTag price={product.price} currencyCode={vendor.currency_code} />
        </div>
        <Button
          variant="accent"
          className="flex-1"
          disabled={soldOut || Boolean(missing) || !vendor.accepts_orders}
          onClick={addToCart}
        >
          {label}
        </Button>
      </div>
    </>
  )
}
