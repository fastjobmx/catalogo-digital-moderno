"use server"

import { z } from "zod"
import { backendFetch } from "@/lib/api"

const orderSchema = z.object({
  slug: z.string().min(1),
  idempotency_key: z.string().min(8).max(64),
  customer_name: z.string().trim().min(2, "Escribe tu nombre"),
  customer_phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,22}$/, "Escribe un celular válido"),
  customer_address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        offer_id: z.string(),
        quantity: z.number().int().min(1),
        size: z.string().nullable(),
      })
    )
    .min(1, "Tu carrito está vacío"),
})

export type OrderInput = z.infer<typeof orderSchema>

export type OrderResult =
  | { ok: true; displayId: number; total: number; whatsappUrl: string }
  | { ok: false; message: string }

export async function submitOrder(input: OrderInput): Promise<OrderResult> {
  const parsed = orderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { slug, ...body } = parsed.data
  try {
    const response = await backendFetch(
      `/store/catalogs/${encodeURIComponent(slug)}/orders`,
      { method: "POST", body: JSON.stringify(body) }
    )
    const payload = await response.json()
    if (!response.ok) {
      return {
        ok: false,
        message: payload.message ?? "No pudimos enviar tu pedido. Intenta de nuevo.",
      }
    }
    return {
      ok: true,
      displayId: payload.order.display_id,
      total: payload.order.total,
      whatsappUrl: payload.whatsapp_url,
    }
  } catch {
    return { ok: false, message: "No pudimos enviar tu pedido. Intenta de nuevo." }
  }
}
