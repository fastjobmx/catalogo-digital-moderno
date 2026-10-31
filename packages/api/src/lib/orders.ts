import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type { OrderStatus } from "../modules/catalogo/models/order-request"
import type CatalogoModuleService from "../modules/catalogo/service"
import { getSellerCatalog, invalidateCatalog } from "./catalog-read"
import { normalizePhone } from "./phone"
import { enqueueWhatsappMessage } from "./queue"
import { getOrCreateProfile } from "./seller-setup"
import {
  buildCustomerMessage,
  buildVendorMessage,
  PaymentMethod,
} from "./whatsapp/messages"

const MAX_ORDERS_PER_PHONE_HOUR = Number(process.env.ORDER_RATE_LIMIT_PER_HOUR || 5)

export type CreateOrderInput = {
  idempotency_key: string
  customer_name: string
  customer_phone: string
  customer_address?: string | null
  notes?: string | null
  items: { offer_id: string; quantity: number; size?: string | null }[]
}

export type OrderSeller = {
  id: string
  name: string
  currency_code: string
}

export class RateLimitError extends Error {}

export async function createOrderRequest(
  container: MedusaContainer,
  seller: OrderSeller,
  vendorPhone: string,
  paymentMethods: PaymentMethod[],
  input: CreateOrderInput
) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const [replay] = await catalogo.listOrderRequests({
    seller_id: seller.id,
    idempotency_key: input.idempotency_key,
  })
  if (replay) {
    return replay
  }

  const phone = normalizePhone(input.customer_phone)
  if (!phone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Teléfono inválido")
  }

  // Cada pedido dispara un WhatsApp a ese número: limitar evita usarlo para acosar a terceros.
  const recent = await catalogo.listOrderRequests(
    {
      customer_phone: phone,
      created_at: { $gte: new Date(Date.now() - 3_600_000) },
    },
    { take: MAX_ORDERS_PER_PHONE_HOUR }
  )
  if (recent.length >= MAX_ORDERS_PER_PHONE_HOUR) {
    throw new RateLimitError("Demasiados pedidos con este teléfono. Intenta más tarde.")
  }

  // Precio y stock salen del servidor; lo que envía el navegador solo elige productos.
  const catalog = await getSellerCatalog(container, seller.id, seller.currency_code)
  const byOffer = new Map(catalog.map((item) => [item.offer_id, item]))
  const lines = input.items.map((line) => {
    const item = byOffer.get(line.offer_id)
    if (!item) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Un producto del carrito ya no está disponible"
      )
    }
    if (item.stock <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${item.title} está agotado`
      )
    }
    if (line.quantity > item.stock) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Solo hay ${item.stock} unidades de ${item.title}`
      )
    }
    if (item.sizes.length && !item.sizes.includes(line.size ?? "")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Elige una talla válida para ${item.title}`
      )
    }
    return {
      offer_id: item.offer_id,
      product_id: item.product_id,
      sku: item.sku,
      title: item.title,
      size: line.size ?? null,
      image_url: item.image_url,
      quantity: line.quantity,
      unit_price: item.price,
      line_total: item.price * line.quantity,
    }
  })
  const total = lines.reduce((sum, line) => sum + line.line_total, 0)

  const order = await catalogo.createOrderRequests({
    seller_id: seller.id,
    idempotency_key: input.idempotency_key,
    customer_name: input.customer_name,
    customer_phone: phone,
    customer_address: input.customer_address || null,
    notes: input.notes || null,
    currency_code: seller.currency_code,
    total,
    items: lines,
  } as any)

  const forMessage = { ...order, items: lines }
  const vendorMessage = buildVendorMessage(forMessage)
  const customerMessage = buildCustomerMessage(forMessage, seller.name, paymentMethods)
  const messages = await catalogo.createWhatsappMessages(
    [
      { ...vendorMessage, recipient: "vendor" as const, to_phone: vendorPhone },
      { ...customerMessage, recipient: "customer" as const, to_phone: phone },
    ].map(({ params, ...message }) => ({
      ...message,
      params: { items: params },
      order_id: order.id,
    }))
  )

  // Si la cola falla, el pedido sigue guardado y sweepPendingMessages lo reencola.
  await Promise.all(
    messages.map((message) =>
      enqueueWhatsappMessage(container, message.id).catch((error) =>
        container
          .resolve("logger")
          .error(`No se pudo encolar ${message.id}: ${error.message}`)
      )
    )
  )

  return order
}

const STOCK_APPLIED: readonly OrderStatus[] = ["confirmado", "entregado"]

/**
 * El stock se descuenta al confirmar, no al pedir: un pedido sin confirmar puede no
 * pagarse nunca. Cancelar un pedido ya confirmado devuelve las unidades.
 */
export async function changeOrderStatus(
  container: MedusaContainer,
  orderId: string,
  status: OrderStatus
) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const order = await catalogo.retrieveOrderRequest(orderId, { relations: ["items"] })

  const wasApplied = STOCK_APPLIED.includes(order.status)
  const willApply = STOCK_APPLIED.includes(status)
  if (wasApplied !== willApply) {
    await adjustOrderStock(container, order, willApply ? -1 : 1)
  }
  await catalogo.updateOrderRequests({ id: orderId, status })
}

async function adjustOrderStock(
  container: MedusaContainer,
  order: {
    seller_id: string
    items: { offer_id: string; title: string; quantity: number }[]
  },
  direction: 1 | -1
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventory = container.resolve(Modules.INVENTORY)
  const profile = await getOrCreateProfile(container, order.seller_id)
  const locationId = profile.stock_location_id as string

  const { data: offers } = await query.graph({
    entity: "offer",
    fields: ["id", "inventory_item_link.inventory_item_id"],
    filters: { id: order.items.map((item) => item.offer_id) },
  })
  const itemByOffer = new Map(
    offers.map((offer: any) => [
      offer.id,
      offer.inventory_item_link?.[0]?.inventory_item_id as string | undefined,
    ])
  )

  // Se valida todo antes de mover nada, para no dejar el pedido descontado a medias.
  const lines = order.items.flatMap((item) => {
    const inventoryItemId = itemByOffer.get(item.offer_id)
    return inventoryItemId ? [{ ...item, inventoryItemId }] : []
  })
  if (direction === -1) {
    const levels = await inventory.listInventoryLevels({
      inventory_item_id: lines.map((line) => line.inventoryItemId),
      location_id: locationId,
    })
    const needed = new Map<string, number>()
    for (const line of lines) {
      needed.set(
        line.inventoryItemId,
        (needed.get(line.inventoryItemId) ?? 0) + line.quantity
      )
    }
    for (const line of lines) {
      const level = levels.find((l) => l.inventory_item_id === line.inventoryItemId)
      if (Number(level?.stocked_quantity ?? 0) < needed.get(line.inventoryItemId)!) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `No hay stock suficiente de ${line.title} para confirmar`
        )
      }
    }
  }

  for (const line of lines) {
    await inventory.adjustInventory(
      line.inventoryItemId,
      locationId,
      direction * line.quantity
    )
  }
  invalidateCatalog(order.seller_id)
}

export async function resendMessage(container: MedusaContainer, messageId: string) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  await catalogo.updateWhatsappMessages({
    id: messageId,
    status: "queued",
    provider_message_id: null,
    attempts: 0,
    last_error: null,
  })
  await enqueueWhatsappMessage(container, messageId)
}

/** Reencola mensajes que quedaron en `queued` más de dos minutos. */
export async function sweepPendingMessages(container: MedusaContainer) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const stale = await catalogo.listWhatsappMessages(
    {
      status: "queued",
      created_at: { $lt: new Date(Date.now() - 120_000) },
      attempts: 0,
    },
    { take: 100 }
  )
  await Promise.all(stale.map((m) => enqueueWhatsappMessage(container, m.id)))
}
