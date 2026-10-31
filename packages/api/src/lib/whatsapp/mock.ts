import { randomUUID } from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { CATALOGO_MODULE } from "../../modules/catalogo"
import type CatalogoModuleService from "../../modules/catalogo/service"
import {
  OutgoingMessage,
  SendResult,
  WhatsAppProvider,
  WhatsAppSendError,
} from "./types"

/** Enviar a este número simula un fallo, para probar reintentos sin Meta ni Twilio. */
export const MOCK_FAILING_PHONE = "573000000000"

/** Sandbox: no sale nada a internet, cada mensaje queda en `whatsapp_outbox`. */
export class MockProvider implements WhatsAppProvider {
  readonly name = "mock"

  constructor(private readonly container: MedusaContainer) {}

  async send(message: OutgoingMessage): Promise<SendResult> {
    const catalogo = this.container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
    const to = `+${message.to}`
    const failed = message.to === MOCK_FAILING_PHONE
    const error = failed ? "Fallo simulado por el sandbox" : null

    await catalogo.createWhatsappOutboxes({
      message_id: message.messageId,
      to,
      template: message.template,
      payload: { params: message.params, body: message.body },
      status: failed ? "failed" : "sent",
      error,
    })

    const summary = message.body.replace(/\s+/g, " ").slice(0, 100)
    console.info(`[WA-MOCK] → ${to} | ${message.template} | ${summary}`)

    if (failed) {
      throw new WhatsAppSendError(error as string, false)
    }
    return { providerMessageId: `mock-${randomUUID()}` }
  }
}
