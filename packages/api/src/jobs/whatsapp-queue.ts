import type { MedusaContainer } from "@medusajs/framework/types"
import { sweepPendingMessages } from "../lib/orders"
import { ensureQueue } from "../lib/queue"

// Medusa no da el contenedor global al arrancar: este job inicia los workers en su
// primera ejecución y después rescata mensajes que no alcanzaron a encolarse.
export default async function whatsappQueueJob(container: MedusaContainer) {
  await ensureQueue(container)
  await sweepPendingMessages(container)
}

export const config = {
  name: "whatsapp-queue",
  schedule: "* * * * *",
}
