"use client"

import { useRef, useState, useTransition, type FormEvent } from "react"
import { CheckCircle2, ShoppingBag, Trash2 } from "lucide-react"
import { submitOrder } from "@/app/[slug]/actions"
import type { Vendor } from "@/lib/api"
import { formatMoney } from "@/lib/utils"
import { useCart } from "./cart-context"
import { QuantityStepper } from "./quantity-stepper"
import { Button } from "./ui/button"
import { Sheet } from "./ui/sheet"

const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-brand"

type Confirmation = { displayId: number; total: number }

export function CartBar({ vendor }: { vendor: Vendor }) {
  const { lines, count, total, setQuantity, clear } = useCart()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [pending, startTransition] = useTransition()
  // Se conserva entre reintentos: si la respuesta se pierde, no se crea un pedido doble.
  const idempotencyKey = useRef<string | null>(null)

  const money = (amount: number) => formatMoney(amount, vendor.currency_code)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    idempotencyKey.current ??= crypto.randomUUID()
    setError(null)

    startTransition(async () => {
      const result = await submitOrder({
        slug: vendor.slug,
        idempotency_key: idempotencyKey.current!,
        customer_name: String(form.get("name")),
        customer_phone: String(form.get("phone")),
        customer_address: String(form.get("address")),
        notes: String(form.get("notes")),
        items: lines.map(({ offer_id, quantity, size }) => ({ offer_id, quantity, size })),
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      idempotencyKey.current = null
      setConfirmation({ displayId: result.displayId, total: result.total })
      clear()
    })
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setConfirmation(null)
      setError(null)
    }
  }

  return (
    <>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="mx-auto flex w-full max-w-md" onClick={() => setOpen(true)}>
            <ShoppingBag className="size-5" aria-hidden />
            Ver pedido ({count}) · {money(total)}
          </Button>
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={confirmation ? "Pedido recibido" : "Tu pedido"}
      >
        {confirmation ? (
          <div className="space-y-3 p-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-brand" aria-hidden />
            <h2 className="text-xl font-semibold">
              Pedido #{confirmation.displayId} por {money(confirmation.total)}
            </h2>
            <p className="text-sm text-muted">
              Te enviamos el resumen por WhatsApp. {vendor.name} se contactará contigo
              para coordinar el pago y la entrega.
            </p>
            {vendor.payment_methods.length > 0 && (
              <ul className="rounded-xl bg-canvas p-3 text-left text-sm">
                <li className="mb-1 font-medium">Medios de pago</li>
                {vendor.payment_methods.map((method) => (
                  <li key={method.name}>
                    {method.name}
                    {method.detail ? `: ${method.detail}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Seguir viendo el catálogo
            </Button>
          </div>
        ) : lines.length === 0 ? (
          <p className="p-8 text-center text-muted">Tu carrito está vacío.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 p-4">
            <ul className="divide-y divide-line">
              {lines.map((line) => (
                <li
                  key={`${line.offer_id}-${line.size}`}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={line.image_url ?? undefined}
                    alt=""
                    className="size-14 shrink-0 rounded-lg bg-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.title}</p>
                    <p className="text-xs text-muted">
                      {line.size ? `Talla ${line.size} · ` : ""}
                      {money(line.price)}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <QuantityStepper
                        value={line.quantity}
                        max={line.stock}
                        label={line.title}
                        onChange={(value) =>
                          setQuantity(line.offer_id, line.size, value)
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Quitar ${line.title}`}
                        onClick={() => setQuantity(line.offer_id, line.size, 0)}
                        className="flex size-11 items-center justify-center text-muted"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="flex justify-between border-t border-line pt-3 font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Nombre
                <input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
              <label className="block text-sm font-medium">
                Celular con WhatsApp
                <input
                  name="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="300 123 4567"
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
              <label className="block text-sm font-medium">
                Dirección (opcional)
                <input
                  name="address"
                  autoComplete="street-address"
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
              <label className="block text-sm font-medium">
                Notas (opcional)
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={500}
                  className={`${inputClass} mt-1 py-2 font-normal`}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enviando…" : "Solicitar pedido"}
            </Button>
          </form>
        )}
      </Sheet>
    </>
  )
}
