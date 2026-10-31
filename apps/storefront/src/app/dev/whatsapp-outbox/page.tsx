import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { backendFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

type OutboxMessage = {
  id: string
  to: string
  template: string
  status: "sent" | "failed"
  error: string | null
  created_at: string
  payload: { body: string }
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

export default async function WhatsappOutboxPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const response = await backendFetch("/dev/whatsapp-outbox", { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Outbox: HTTP ${response.status}`)
  }
  const { messages, count } = (await response.json()) as {
    messages: OutboxMessage[]
    count: number
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Sandbox de WhatsApp</h1>
      <p className="mt-1 text-sm text-muted">
        {count} mensajes registrados. Ninguno salió a internet.
      </p>

      {messages.length === 0 && (
        <p className="py-16 text-center text-muted">
          Aún no hay mensajes. Haz un pedido en un catálogo.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {messages.map((message) => (
          <li key={message.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{message.to}</p>
              <span
                className={
                  message.status === "failed"
                    ? "text-sm font-medium text-danger"
                    : "text-sm text-muted"
                }
              >
                {message.status === "failed" ? "Falló" : "Enviado"}
              </span>
            </div>
            <p className="text-xs text-muted">
              {new Date(message.created_at).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}{" "}
              · {message.template}
            </p>
            <p className="mt-2 text-sm whitespace-pre-line">{message.payload.body}</p>
            {message.error && (
              <p className="mt-2 text-sm text-danger">{message.error}</p>
            )}
            <form action={retry} className="mt-3">
              <input type="hidden" name="id" value={message.id} />
              <Button type="submit" variant="outline">
                Reintentar
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
