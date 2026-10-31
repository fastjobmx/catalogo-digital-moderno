import {
  OutgoingMessage,
  SendResult,
  WhatsAppProvider,
  WhatsAppSendError,
} from "./types"

/** WhatsApp Cloud API de Meta. Siempre por plantilla: el destinatario no ha abierto ventana de 24 h. */
export class CloudApiProvider implements WhatsAppProvider {
  readonly name = "cloud"

  async send(message: OutgoingMessage): Promise<SendResult> {
    const version = process.env.WHATSAPP_API_VERSION || "v23.0"
    const phoneNumberId = process.env.WA_PHONE_ID
    const token = process.env.WA_TOKEN
    if (!phoneNumberId || !token) {
      throw new WhatsAppSendError(
        "Faltan WA_TOKEN o WA_PHONE_ID",
        false
      )
    }

    const baseUrl = process.env.WHATSAPP_API_BASE_URL || "https://graph.facebook.com"
    const response = await fetch(
      `${baseUrl}/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: {
            name: message.template,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "es" },
            components: [
              {
                type: "body",
                parameters: message.params.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      }
    )

    const payload = (await response.json().catch(() => ({}))) as {
      messages?: { id: string }[]
      error?: { message?: string; code?: number }
    }

    if (!response.ok || !payload.messages?.[0]?.id) {
      const detail = payload.error?.message ?? `HTTP ${response.status}`
      const code = payload.error?.code
      // 429 y 5xx son transitorios; 130429, 131056 y 80007 son límites de tasa de Meta.
      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        code === 130429 ||
        code === 131056 ||
        code === 80007
      throw new WhatsAppSendError(`Cloud API: ${detail}`, retryable)
    }

    return { providerMessageId: payload.messages[0].id }
  }
}
