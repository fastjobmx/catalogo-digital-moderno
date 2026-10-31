export const TEMPLATE_VENDOR = process.env.WHATSAPP_TEMPLATE_VENDOR || "pedido_proveedor"
export const TEMPLATE_CUSTOMER = process.env.WHATSAPP_TEMPLATE_CUSTOMER || "pedido_cliente"

const MAX_PARAM_LENGTH = 900

type OrderForMessage = {
  display_id: number
  customer_name: string
  customer_phone: string
  customer_address?: string | null
  notes?: string | null
  currency_code: string
  total: unknown
  items: {
    title: string
    sku: string
    size?: string | null
    quantity: number
  }[]
}

export type PaymentMethod = { name: string; detail?: string }

export function formatMoney(amount: unknown, currencyCode: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

// Meta rechaza variables de plantilla con saltos de línea, tabs o más de 4 espacios seguidos.
function toTemplateParam(value: string): string {
  const clean = value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim()
  if (!clean) {
    return "-"
  }
  return clean.length > MAX_PARAM_LENGTH
    ? `${clean.slice(0, MAX_PARAM_LENGTH - 1)}…`
    : clean
}

function itemLabel(item: OrderForMessage["items"][number]): string {
  const size = item.size ? ` (${item.size})` : ""
  return `${item.quantity}x ${item.title}${size} [${item.sku}]`
}

function paymentLabel(methods: PaymentMethod[]): string {
  if (!methods.length) {
    return "a convenir con el proveedor"
  }
  return methods
    .map((m) => (m.detail ? `${m.name}: ${m.detail}` : m.name))
    .join(", ")
}

export function buildVendorMessage(order: OrderForMessage) {
  const total = formatMoney(order.total, order.currency_code)
  const address = order.customer_address || "No indicada"
  const params = [
    `#${order.display_id}`,
    order.items.map(itemLabel).join(" | "),
    total,
    order.customer_name,
    `+${order.customer_phone}`,
    address,
  ].map(toTemplateParam)

  const body = [
    `Nuevo pedido #${order.display_id}`,
    "",
    ...order.items.map((i) => `• ${itemLabel(i)}`),
    "",
    `Total: ${total}`,
    `Cliente: ${order.customer_name}`,
    `Teléfono: +${order.customer_phone}`,
    `Dirección: ${address}`,
    ...(order.notes ? [`Notas: ${order.notes}`] : []),
  ].join("\n")

  return { template: TEMPLATE_VENDOR, params, body }
}

export function buildCustomerMessage(
  order: OrderForMessage,
  vendorName: string,
  methods: PaymentMethod[]
) {
  const total = formatMoney(order.total, order.currency_code)
  const payment = paymentLabel(methods)
  const params = [`#${order.display_id}`, total, payment, vendorName].map(toTemplateParam)
  const body =
    `Tu pedido #${order.display_id} por ${total} ha sido recibido. ` +
    `Medios de pago: ${payment}. ${vendorName} se contactará contigo.`
  return { template: TEMPLATE_CUSTOMER, params, body }
}
