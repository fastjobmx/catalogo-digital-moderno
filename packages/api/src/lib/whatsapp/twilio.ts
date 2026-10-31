import {
  OutgoingMessage,
  SendResult,
  WhatsAppProvider,
  WhatsAppSendError,
} from "./types"
import { TEMPLATE_VENDOR } from "./messages"

/**
 * Twilio API for WhatsApp. En producción, fuera de la ventana de 24 h, define
 * TWILIO_CONTENT_SID_VENDOR y TWILIO_CONTENT_SID_CUSTOMER; sin ellos envía texto libre (sandbox).
 */
export class TwilioProvider implements WhatsAppProvider {
  readonly name = "twilio"

  async send(message: OutgoingMessage): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM
    if (!sid || !token || !from) {
      throw new WhatsAppSendError(
        "Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM",
        false
      )
    }

    const form = new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:+${message.to}`,
    })
    if (process.env.WHATSAPP_PUBLIC_URL) {
      form.set("StatusCallback", `${process.env.WHATSAPP_PUBLIC_URL}/webhooks/twilio`)
    }
    const contentSid =
      message.template === TEMPLATE_VENDOR
        ? process.env.TWILIO_CONTENT_SID_VENDOR
        : process.env.TWILIO_CONTENT_SID_CUSTOMER
    if (contentSid) {
      form.set("ContentSid", contentSid)
      form.set(
        "ContentVariables",
        JSON.stringify(
          Object.fromEntries(message.params.map((value, i) => [String(i + 1), value]))
        )
      )
    } else {
      form.set("Body", message.body)
    }

    const baseUrl = process.env.TWILIO_API_BASE_URL || "https://api.twilio.com"
    const response = await fetch(
      `${baseUrl}/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(15_000),
        body: form,
      }
    )
    const payload = (await response.json().catch(() => ({}))) as {
      sid?: string
      message?: string
    }
    if (!response.ok || !payload.sid) {
      throw new WhatsAppSendError(
        `Twilio: ${payload.message ?? `HTTP ${response.status}`}`,
        response.status === 429 || response.status >= 500
      )
    }
    return { providerMessageId: payload.sid }
  }
}
