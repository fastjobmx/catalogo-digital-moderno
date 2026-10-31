export const money = (amount: number, code = "cop") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: code.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)

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

export function readableOn(hex: string) {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#111827")
    ? "#ffffff"
    : "#111827"
}
