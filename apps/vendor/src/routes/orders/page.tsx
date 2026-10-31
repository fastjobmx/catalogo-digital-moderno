import { useCallback, useEffect, useState } from "react"
import { Badge, Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { vendorFetch } from "../../lib/api"

type Message = {
  id: string
  recipient: "vendor" | "customer"
  status: string
  last_error: string | null
}

type Order = {
  id: string
  display_id: number
  status: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  notes: string | null
  currency_code: string
  total: number
  created_at: string
  items: { id: string; title: string; sku: string; size: string | null; quantity: number; line_total: number }[]
  messages: Message[]
}

const STATUS_LABELS: Record<string, string> = {
  pendiente_confirmacion: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

const MESSAGE_LABELS: Record<string, string> = {
  queued: "En cola",
  retrying: "Reintentando",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Falló",
}

const money = (amount: number, code: string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: code.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [filter, setFilter] = useState("pendiente_confirmacion")

  const load = useCallback(() => {
    const query = filter === "todos" ? "" : `?status=${filter}`
    vendorFetch<{ orders: Order[] }>(`/vendor/order-requests${query}`)
      .then(({ orders }) => setOrders(orders))
      .catch((error) => toast.error(error.message))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (order: Order, status: string) => {
    try {
      await vendorFetch(`/vendor/order-requests/${order.id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      })
      load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const resend = async (order: Order, message: Message) => {
    try {
      await vendorFetch(
        `/vendor/order-requests/${order.id}/messages/${message.id}/resend`,
        { method: "POST" }
      )
      toast.success("Mensaje en cola")
      setTimeout(load, 2000)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Heading>Pedidos</Heading>
        <div className="w-48">
          <Select value={filter} onValueChange={setFilter}>
            <Select.Trigger aria-label="Filtrar por estado">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="todos">Todos</Select.Item>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <Select.Item key={value} value={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {orders?.length === 0 && (
        <Text className="text-ui-fg-subtle px-6 py-10 text-center">
          No hay pedidos en este estado.
        </Text>
      )}

      {orders?.map((order) => (
        <div key={order.id} className="space-y-2 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text weight="plus">
              #{order.display_id} · {money(order.total, order.currency_code)}
            </Text>
            <div className="w-44">
              <Select
                value={order.status}
                onValueChange={(status) => changeStatus(order, status)}
              >
                <Select.Trigger aria-label={`Estado del pedido ${order.display_id}`}>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <Text size="small">
            {order.customer_name} · +{order.customer_phone}
            {order.customer_address ? ` · ${order.customer_address}` : ""}
          </Text>
          {order.notes && (
            <Text size="small" className="text-ui-fg-subtle">
              Notas: {order.notes}
            </Text>
          )}
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                <Text size="small">
                  {item.quantity} x {item.title}
                  {item.size ? ` (${item.size})` : ""} · {item.sku}
                </Text>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            {order.messages.map((message) => (
              <span key={message.id} className="flex items-center gap-1">
                <Badge
                  size="2xsmall"
                  color={message.status === "failed" ? "red" : "grey"}
                  title={message.last_error ?? undefined}
                >
                  {message.recipient === "vendor" ? "Proveedor" : "Cliente"}:{" "}
                  {MESSAGE_LABELS[message.status] ?? message.status}
                </Badge>
                {message.status === "failed" && (
                  <Button size="small" variant="secondary" onClick={() => resend(order, message)}>
                    Reenviar
                  </Button>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </Container>
  )
}

export default OrdersPage
