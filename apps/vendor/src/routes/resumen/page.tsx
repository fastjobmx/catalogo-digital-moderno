import { useEffect, useState } from "react"
import { Badge, Container, Heading, Text, toast } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Link } from "react-router-dom"
import { vendorFetch } from "../../lib/api"
import { money } from "../../lib/format"

type Dashboard = {
  currency_code: string
  orders_today: number
  sales_today: number
  low_stock: number
  sold_out: number
  products: number
  recent_orders: {
    id: string
    display_id: number
    customer_name: string
    total: number
    status: string
    created_at: string
  }[]
}

const STATUS: Record<string, { label: string; color: "orange" | "blue" | "green" | "red" }> = {
  pendiente_confirmacion: { label: "Pendiente", color: "orange" },
  confirmado: { label: "Confirmado", color: "blue" },
  entregado: { label: "Entregado", color: "green" },
  cancelado: { label: "Cancelado", color: "red" },
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Container className="p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <p className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: tone }}>
        {value}
      </p>
    </Container>
  )
}

export const config: RouteConfig = {
  label: "Resumen",
  icon: ChartBar,
  rank: -1,
}

const SummaryPage = () => {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => {
    vendorFetch<Dashboard>("/vendor/dashboard")
      .then(setData)
      .catch((error) => toast.error(error.message))
  }, [])

  if (!data) {
    return <Container className="p-6">Cargando…</Container>
  }

  const code = data.currency_code
  return (
    <div className="flex flex-col gap-4">
      <Heading>Resumen de hoy</Heading>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Pedidos de hoy" value={String(data.orders_today)} />
        <KpiCard label="Ventas del día" value={money(data.sales_today, code)} />
        <KpiCard label="Bajo stock" value={String(data.low_stock)} tone="#B45309" />
        <KpiCard label="Agotados" value={String(data.sold_out)} tone="#B42318" />
      </div>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Últimos pedidos</Heading>
          <Link to="/orders" className="text-ui-fg-interactive text-sm font-medium">
            Ver todos
          </Link>
        </div>
        {data.recent_orders.length === 0 && (
          <Text className="text-ui-fg-subtle px-6 py-10 text-center">
            Aún no tienes pedidos. Comparte tu catálogo por WhatsApp.
          </Text>
        )}
        {data.recent_orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between gap-3 px-6 py-3">
            <div className="min-w-0">
              <Text weight="plus">
                #{order.display_id} · {order.customer_name}
              </Text>
              <Text size="small" className="text-ui-fg-subtle tabular-nums">
                {money(Number(order.total), code)}
              </Text>
            </div>
            <Badge size="2xsmall" color={STATUS[order.status]?.color}>
              {STATUS[order.status]?.label ?? order.status}
            </Badge>
          </div>
        ))}
      </Container>
    </div>
  )
}

export default SummaryPage
