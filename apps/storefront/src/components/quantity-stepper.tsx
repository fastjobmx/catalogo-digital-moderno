"use client"

import { Minus, Plus } from "lucide-react"

type Props = {
  value: number
  max: number
  min?: number
  label: string
  onChange: (value: number) => void
}

export function QuantityStepper({ value, max, min = 1, label, onChange }: Props) {
  return (
    <div className="flex items-center rounded-xl border border-line">
      <button
        type="button"
        aria-label={`Quitar una unidad de ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex size-11 items-center justify-center disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span aria-live="polite" className="w-7 text-center text-sm font-semibold">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Agregar una unidad de ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex size-11 items-center justify-center disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
