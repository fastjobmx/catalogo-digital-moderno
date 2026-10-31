import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createOrderRequest, RateLimitError } from "../../../../../lib/orders"
import { getPublicSeller } from "../../../../../lib/public-seller"
import { parseOrThrow, z } from "../../../../../lib/validation"
import { buildOrderWhatsappUrl } from "../../../../../lib/whatsapp/messages"
import { CATALOGO_MODULE } from "../../../../../modules/catalogo"
import type CatalogoModuleService from "../../../../../modules/catalogo/service"

const bodySchema = z.object({
  idempotency_key: z.string().min(8).max(64),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(7).max(24),
  customer_address: z.string().trim().max(300).nullish(),
  notes: z.string().trim().max(500).nullish(),
  items: z
    .array(
      z.object({
        offer_id: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
        size: z.string().max(16).nullish(),
      })
    )
    .min(1)
    .max(100),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseOrThrow(bodySchema, req.body)
  const { seller, whatsapp_phone, payment_methods } = await getPublicSeller(
    req.scope,
    req.params.slug
  )
  if (!whatsapp_phone) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Este proveedor aún no recibe pedidos"
    )
  }

  try {
    const order = await createOrderRequest(
      req.scope,
      seller as any,
      whatsapp_phone,
      payment_methods,
      body
    )
    // 202: el pedido quedó guardado; los mensajes salen en segundo plano.
    const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
    const full = await catalogo.retrieveOrderRequest(order.id, {
      relations: ["items"],
    })
    res.status(202).json({
      whatsapp_url: buildOrderWhatsappUrl(
        full as any,
        seller.name,
        whatsapp_phone,
        payment_methods
      ),
      order: {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        total: Number(order.total),
        currency_code: order.currency_code,
      },
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.status(429).json({ message: error.message })
      return
    }
    throw error
  }
}
