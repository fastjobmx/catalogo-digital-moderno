import { createHmac, timingSafeEqual } from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyDeliveryStatus } from "../../../lib/whatsapp/status"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

/** Verificación del webhook al registrarlo en Meta. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (
    token &&
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === token
  ) {
    res.status(200).send(String(req.query["hub.challenge"]))
    return
  }
  res.sendStatus(403)
}

function isValidSignature(rawBody: Buffer | undefined, signature: unknown) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !rawBody || typeof signature !== "string") {
    return false
  }
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

type StatusEvent = {
  id: string
  status: string
  errors?: { title?: string; message?: string }[]
}

/** Estados de entrega de Meta. Responde 200 rápido: Meta reintenta ante cualquier otro código. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!isValidSignature((req as any).rawBody, req.headers["x-hub-signature-256"])) {
    res.sendStatus(401)
    return
  }

  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const body = req.body as {
    entry?: { changes?: { value?: { statuses?: StatusEvent[] } }[] }[]
  }
  const events = (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? [])
  )

  for (const event of events) {
    await applyDeliveryStatus(
      catalogo,
      event.id,
      event.status,
      event.errors?.[0]?.message ?? event.errors?.[0]?.title
    )
  }

  res.sendStatus(200)
}
