import type { MedusaContainer } from "@medusajs/framework/types"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type CatalogoModuleService from "../modules/catalogo/service"
import { getWhatsAppProvider, WhatsAppSendError } from "./whatsapp"

// Debe coincidir con retryLimit de la cola: 1 intento inicial + 5 reintentos.
const MAX_ATTEMPTS = 6

/**
 * Envía un mensaje guardado. Lanza solo en errores transitorios para que la cola
 * reintente; los definitivos quedan en `failed` y se pueden reenviar a mano.
 */
export async function deliverWhatsappMessage(
  container: MedusaContainer,
  messageId: string
) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const logger = container.resolve("logger")
  const message = await catalogo.retrieveWhatsappMessage(messageId)

  // Un reintento de la cola no debe duplicar un mensaje ya aceptado por el proveedor.
  if (message.provider_message_id) {
    return
  }

  const provider = getWhatsAppProvider(container)
  const attempts = message.attempts + 1
  try {
    const { providerMessageId } = await provider.send({
      messageId,
      to: message.to_phone,
      template: message.template,
      params: (message.params as unknown as { items: string[] }).items,
      body: message.body,
    })
    await catalogo.updateWhatsappMessages({
      id: messageId,
      status: "sent",
      provider: provider.name,
      provider_message_id: providerMessageId,
      attempts,
      last_error: null,
    })
  } catch (error) {
    const retryable = !(error instanceof WhatsAppSendError) || error.retryable
    const canRetry = retryable && attempts < MAX_ATTEMPTS
    await catalogo.updateWhatsappMessages({
      id: messageId,
      status: canRetry ? "retrying" : "failed",
      provider: provider.name,
      attempts,
      last_error: (error as Error).message,
    })
    logger.warn(`WhatsApp ${messageId} intento ${attempts}: ${(error as Error).message}`)
    if (canRetry) {
      throw error
    }
  }
}
