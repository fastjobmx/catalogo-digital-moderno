import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { backendFetch } from "@/lib/api"

export const dynamic = "force-dynamic"

type OutboxMessage = {
  id: string
  to: string
  template: string
  status: "sent" | "failed"
  error: string | null
  created_at: string
  vendor: string | null
  payload: { body: string }
}

type Outbox = {
  messages: OutboxMessage[]
  count: number
  vendors: { id: string; name: string }[]
}

async function retry(formData: FormData) {
  "use server"
  await backendFetch(`/dev/whatsapp-outbox/${formData.get("id")}/retry`, {
    method: "POST",
  })
  // El worker tarda un instante en procesar el mensaje reencolado.
  await new Promise((resolve) => setTimeout(resolve, 1500))
  revalidatePath("/dev/whatsapp-outbox")
}

type Props = { searchParams: Promise<{ proveedor?: string }> }

export default async function WhatsappOutboxPage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const { proveedor } = await searchParams
  const query = proveedor ? `?vendor=${encodeURIComponent(proveedor)}` : ""
  const response = await backendFetch(`/dev/whatsapp-outbox${query}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`Outbox: HTTP ${response.status}`)
  }
  const { messages, count, vendors } = (await response.json()) as Outbox

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl">Sandbox de WhatsApp</h1>
      <p className="mt-1 text-sm text-muted">
        {count} mensajes registrados. Ninguno salió a internet.
      </p>

      <form className="mt-4 flex gap-2">
        <select
          name="proveedor"
          defaultValue={proveedor ?? ""}
          aria-label="Filtrar por proveedor"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3"
        >
          <option value="">Todos los proveedores</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {messages.length === 0 && (
        <p className="py-16 text-center text-muted">
          Aún no hay mensajes. Haz un pedido en un catálogo.
        </p>
      )}

      <ul className="mt-5 space-y-5 rounded-card bg-[#efe7dd] p-3 sm:p-4">
        {messages.map((message) => (
          <li key={message.id}>
            <p className="mb-1 text-xs font-bold text-ink">
              Para {message.to}
              {message.vendor ? ` · ${message.vendor}` : ""}
            </p>
            <div className="w-fit max-w-[92%] rounded-2xl rounded-tl-sm bg-[#d9fdd3] p-3 shadow-card">
              <p className="text-sm break-words whitespace-pre-line">{message.payload.body}</p>
              <p className="mt-1 text-right text-[11px] text-muted">
                {new Date(message.created_at).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                  dateStyle: "short",
                  timeStyle: "short",
                })}{" "}
                · {message.status === "failed" ? "Falló" : "Enviado"}
              </p>
            </div>
            {message.error && (
              <p className="mt-1 text-sm font-medium text-danger">{message.error}</p>
            )}
            <form action={retry} className="mt-1">
              <input type="hidden" name="id" value={message.id} />
              <Button type="submit" variant="outline" size="small">
                Reintentar
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
