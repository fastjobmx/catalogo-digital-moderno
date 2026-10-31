/**
 * Normaliza a dígitos con código de país, sin "+", como lo pide WhatsApp.
 * Acepta "300 123 4567", "+57 300-123-4567" o "573001234567". Devuelve null si no es válido.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  // Celular colombiano sin indicativo: 10 dígitos que empiezan por 3.
  const full = /^3\d{9}$/.test(digits) ? `57${digits}` : digits
  return /^[1-9]\d{9,14}$/.test(full) ? full : null
}
