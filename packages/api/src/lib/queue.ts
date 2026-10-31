import type { MedusaContainer } from "@medusajs/framework/types"
import type { PgBoss } from "pg-boss" with { "resolution-mode": "import" }
import { processCatalogImport } from "./catalog-import"
import { deliverWhatsappMessage } from "./order-notifications"

const QUEUE_WHATSAPP = "whatsapp-send"
const QUEUE_IMPORT = "catalog-import"

let booting: Promise<PgBoss> | undefined

async function boot(container: MedusaContainer): Promise<PgBoss> {
  const { PgBoss } = await import("pg-boss")
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    schema: "pgboss",
  })
  boss.on("error", (error: Error) =>
    container.resolve("logger").error(`pg-boss: ${error.message}`)
  )
  await boss.start()

  await boss.createQueue(QUEUE_WHATSAPP, {
    retryLimit: 5,
    retryDelay: 10,
    retryBackoff: true,
    retryDelayMax: 600,
    expireInSeconds: 60,
  })
  await boss.createQueue(QUEUE_IMPORT, {
    retryLimit: 1,
    retryDelay: 30,
    expireInSeconds: 1800,
  })

  await boss.work<{ message_id: string }>(
    QUEUE_WHATSAPP,
    { batchSize: 5, pollingIntervalSeconds: 1 },
    async (jobs) => {
      await Promise.all(
        jobs.map((job) => deliverWhatsappMessage(container, job.data.message_id))
      )
    }
  )
  await boss.work<{ import_id: string }>(
    QUEUE_IMPORT,
    { pollingIntervalSeconds: 1 },
    async ([job]) => {
      await processCatalogImport(container, job.data.import_id)
    }
  )

  return boss
}

/** Arranca pg-boss y los workers una sola vez por proceso. */
export function ensureQueue(container: MedusaContainer): Promise<PgBoss> {
  booting ??= boot(container).catch((error) => {
    booting = undefined
    throw error
  })
  return booting
}

export async function enqueueWhatsappMessage(
  container: MedusaContainer,
  messageId: string
) {
  const boss = await ensureQueue(container)
  await boss.send(QUEUE_WHATSAPP, { message_id: messageId })
}

export async function enqueueCatalogImport(
  container: MedusaContainer,
  importId: string
) {
  const boss = await ensureQueue(container)
  await boss.send(QUEUE_IMPORT, { import_id: importId })
}
