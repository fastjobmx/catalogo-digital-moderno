import type CatalogoModuleService from "../../modules/catalogo/service"
import type { MessageStatus } from "../../modules/catalogo/models/whatsapp-message"

const STATUS_RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 }

/** Aplica un estado de entrega. Los eventos llegan en desorden: "read" no retrocede a "delivered". */
export async function applyDeliveryStatus(
  catalogo: CatalogoModuleService,
  providerMessageId: string,
  status: string,
  error?: string
) {
  const [message] = await catalogo.listWhatsappMessages({
    provider_message_id: providerMessageId,
  })
  if (!message) {
    return
  }
  if (status === "failed") {
    await catalogo.updateWhatsappMessages({
      id: message.id,
      status: "failed",
      last_error: error ?? "Fallo de entrega",
    })
  } else if ((STATUS_RANK[status] ?? 0) > (STATUS_RANK[message.status] ?? 0)) {
    await catalogo.updateWhatsappMessages({
      id: message.id,
      status: status as MessageStatus,
    })
  }
}
