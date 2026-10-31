"use client"

import type { ProductOption } from "@/lib/api"
import { cn } from "@/lib/utils"

type Props = {
  options: ProductOption[]
  soldOut: string[]
  value: Record<string, string>
  onChange: (name: string, value: string) => void
}

export function VariantSelector({ options, soldOut, value, onChange }: Props) {
  return (
    <div className="space-y-4">
      {options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2 text-sm font-bold">
            {option.name}
            {value[option.name] && (
              <span className="ml-1 font-normal text-muted">{value[option.name]}</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((item) => {
              const unavailable = soldOut.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={value[option.name] === item}
                  aria-label={unavailable ? `${item}, agotado` : item}
                  onClick={() => onChange(option.name, item)}
                  className={cn(
                    "min-h-11 min-w-11 rounded-xl border px-3 text-sm font-semibold transition-colors duration-200",
                    value[option.name] === item
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-line bg-surface hover:border-muted",
                    unavailable && "text-muted line-through opacity-60"
                  )}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
