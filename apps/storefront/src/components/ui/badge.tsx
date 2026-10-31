import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const tones = {
  brand: "bg-brand text-brand-foreground",
  accent: "bg-accent text-accent-foreground",
  danger: "bg-danger text-white",
  neutral: "bg-canvas text-ink ring-1 ring-line",
  dark: "bg-ink text-white",
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof tones
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}
