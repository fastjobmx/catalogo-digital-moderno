import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)
}

function luminance(hex: string) {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Blanco o casi negro: el que tenga más contraste, así un neón nunca lleva texto blanco. */
export function readableOn(hex: string) {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#111827")
    ? "#ffffff"
    : "#111827"
}

export function discountPercent(price: number, compareAt: number | null) {
  return compareAt ? Math.round((1 - price / compareAt) * 100) : 0
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
}
