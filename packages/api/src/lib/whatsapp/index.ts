import type { MedusaContainer } from "@medusajs/framework/types"
import { CloudApiProvider } from "./cloud"
import { MockProvider } from "./mock"
import { TwilioProvider } from "./twilio"
import { WhatsAppProvider } from "./types"

export * from "./types"

export function getWhatsAppProvider(container: MedusaContainer): WhatsAppProvider {
  switch (process.env.WHATSAPP_PROVIDER || "mock") {
    case "cloud":
      // En desarrollo, sin credenciales se usa el sandbox. En producción se falla a la vista:
      // simular el envío dejaría pedidos sin avisar y sin ningún error.
      if (
        !(process.env.WA_TOKEN && process.env.WA_PHONE_ID) &&
        process.env.NODE_ENV !== "production"
      ) {
        container
          .resolve("logger")
          .warn("WHATSAPP_PROVIDER=cloud sin WA_TOKEN o WA_PHONE_ID: se usa el mock")
        return new MockProvider(container)
      }
      return new CloudApiProvider()
    case "twilio":
      return new TwilioProvider()
    case "mock":
      return new MockProvider(container)
    default:
      throw new Error(`WHATSAPP_PROVIDER no soportado: ${process.env.WHATSAPP_PROVIDER}`)
  }
}
