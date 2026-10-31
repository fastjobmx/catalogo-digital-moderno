import { useCallback, useEffect, useState } from "react"
import { Badge, Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import { getAuthHeaders } from "@mercurjs/admin"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"

declare const __BACKEND_URL__: string

type Message = { id: string; recipient: string; status: string; last_error: string | null }

type Overview = {
  commission_percent: number
  vendors: {
    id: string
    name: string
    handle: string
    status: string
    currency_code: string
    orders: number
    sales: number
    commission: number
  }[]
  orders: {
    id: string
    display_id: number
    seller_id: string
    status: string
    customer_name: string
    currency_code: string
    total: number
    messages: Message[]
  }[]
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await getAuthHeaders()
  const response = await fetch(`${__BACKEND_URL__}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(auth as Record<string, string>) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message ?? `Error ${response.status}`)
  }
  return payload as T
}

const money = (amount: number, code: string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: code.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)

export const config: RouteConfig = {
  label: "Catálogo global",
  icon: ChartBar,
}

const CatalogOverviewPage = () => {
  const [data, setData] = useState<Overview | null>(null)

  const load = useCallback(() => {
    adminFetch<Overview>("/admin/catalog-overview")
      .then(setData)
      .catch((error) => toast.error(error.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resend = async (message: Message) => {
    try {
      await adminFetch(`/admin/whatsapp-messages/${message.id}/resend`, { method: "POST" })
      toast.success("Mensaje en cola")
      setTimeout(load, 2000)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  if (!data) {
    return <Container className="p-6">Cargando…</Container>
  }

  const vendorName = new Map(data.vendors.map((vendor) => [vendor.id, vendor.name]))

  return (
    <div className="space-y-4">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading>Proveedores</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Todos los pedidos no cancelados. Comisión: {data.commission_percent} %.
          </Text>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Proveedor</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Pedidos</Table.HeaderCell>
              <Table.HeaderCell>Ventas</Table.HeaderCell>
              <Table.HeaderCell>Comisión</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.vendors.map((vendor) => (
              <Table.Row key={vendor.id}>
                <Table.Cell>{vendor.name}</Table.Cell>
                <Table.Cell>{vendor.status}</Table.Cell>
                <Table.Cell>{vendor.orders}</Table.Cell>
                <Table.Cell>{money(vendor.sales, vendor.currency_code)}</Table.Cell>
                <Table.Cell>{money(vendor.commission, vendor.currency_code)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading>Últimos 200 pedidos</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Pedido</Table.HeaderCell>
              <Table.HeaderCell>Proveedor</Table.HeaderCell>
              <Table.HeaderCell>Cliente</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>WhatsApp</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.orders.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>#{order.display_id}</Table.Cell>
                <Table.Cell>{vendorName.get(order.seller_id) ?? "-"}</Table.Cell>
                <Table.Cell>{order.customer_name}</Table.Cell>
                <Table.Cell>{money(order.total, order.currency_code)}</Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap items-center gap-1 py-1">
                    {order.messages.map((message) => (
                      <span key={message.id} className="flex items-center gap-1">
                        <Badge
                          size="2xsmall"
                          color={message.status === "failed" ? "red" : "grey"}
                          title={message.last_error ?? undefined}
                        >
                          {message.recipient === "vendor" ? "Proveedor" : "Cliente"}:{" "}
                          {message.status}
                        </Badge>
                        {message.status === "failed" && (
                          <Button size="small" variant="secondary" onClick={() => resend(message)}>
                            Reenviar
                          </Button>
                        )}
                      </span>
                    ))}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default CatalogOverviewPage
