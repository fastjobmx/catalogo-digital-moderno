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

/** Negro o blanco según cuál se lea mejor sobre el color de la marca. */
export function readableOn(hex: string) {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return luminance > 0.4 ? "#111111" : "#ffffff"
}
