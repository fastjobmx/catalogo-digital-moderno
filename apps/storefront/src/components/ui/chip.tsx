import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }

export function Chip({ active, className, ...props }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-line bg-surface text-ink hover:border-muted",
        className
      )}
      {...props}
    />
  )
}
