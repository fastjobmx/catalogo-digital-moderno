import { createHmac, timingSafeEqual } from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyDeliveryStatus } from "../../../lib/whatsapp/status"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

// Algoritmo de Twilio: HMAC-SHA1 de la URL pública más los parámetros ordenados.
function isValidSignature(params: Record<string, string>, signature: unknown) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const publicUrl = process.env.WHATSAPP_PUBLIC_URL
  if (!token || !publicUrl || typeof signature !== "string") {
    return false
  }
  const payload = Object.keys(params)
    .sort()
    .reduce((text, key) => text + key + params[key], `${publicUrl}/webhooks/twilio`)
  const expected = createHmac("sha1", token).update(payload).digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const params = req.body as Record<string, string>
  if (!isValidSignature(params, req.headers["x-twilio-signature"])) {
    res.sendStatus(401)
    return
  }

  const status = params.MessageStatus === "undelivered" ? "failed" : params.MessageStatus
  await applyDeliveryStatus(
    req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE),
    params.MessageSid,
    status,
    params.ErrorCode ? `Twilio ${params.ErrorCode}` : undefined
  )
  res.sendStatus(200)
}
