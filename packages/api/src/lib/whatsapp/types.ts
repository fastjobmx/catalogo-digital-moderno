export type OutgoingMessage = {
  messageId: string
  to: string
  template: string
  params: string[]
  body: string
}

export type SendResult = { providerMessageId: string }

/** Error de envío; `retryable: false` evita gastar reintentos, p. ej. número inválido. */
export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean
  ) {
    super(message)
  }
}

export interface WhatsAppProvider {
  readonly name: string
  send(message: OutgoingMessage): Promise<SendResult>
}
