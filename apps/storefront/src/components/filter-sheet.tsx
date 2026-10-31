"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import type { Facets } from "@/lib/api"
import { Button } from "./ui/button"
import { Chip } from "./ui/chip"
import { Sheet } from "./ui/sheet"

function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = (change: (search: URLSearchParams) => void) => {
    const search = new URLSearchParams(params)
    search.delete("limite")
    change(search)
    startTransition(() =>
      router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { scroll: false })
    )
  }

  const selected = new Map(
    (params.get("op") ?? "")
      .split("|")
      .filter(Boolean)
      .map((pair) => pair.split(":") as [string, string])
  )

  const toggleOption = (name: string, value: string) =>
    update((search) => {
      const next = new Map(selected)
      if (next.get(name) === value) {
        next.delete(name)
      } else {
        next.set(name, value)
      }
      const encoded = [...next].map((pair) => pair.join(":")).join("|")
      if (encoded) {
        search.set("op", encoded)
      } else {
        search.delete("op")
      }
    })

  const toggleBrand = (brand: string) =>
    update((search) => {
      if (search.get("marca") === brand) {
        search.delete("marca")
      } else {
        search.set("marca", brand)
      }
    })

  const setPrice = (key: "min" | "max", value: string) =>
    update((search) => {
      if (value) {
        search.set(key, value)
      } else {
        search.delete(key)
      }
    })

  const clear = () =>
    update((search) => {
      ;["marca", "min", "max", "op"].forEach((key) => search.delete(key))
    })

  return { params, selected, toggleOption, toggleBrand, setPrice, clear }
}

export function FilterPanel({ facets }: { facets: Facets }) {
  const { params, selected, toggleOption, toggleBrand, setPrice, clear } = useFilters()
  const hasFilters = ["marca", "min", "max", "op"].some((key) => params.get(key))

  return (
    <div className="space-y-5">
      {facets.options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2 text-sm font-bold">{option.name}</legend>
          <div className="flex flex-wrap gap-1.5">
            {option.values.map((value) => (
              <Chip
                key={value}
                active={selected.get(option.name) === value}
                onClick={() => toggleOption(option.name, value)}
                className="min-h-9 px-3"
              >
                {value}
              </Chip>
            ))}
          </div>
        </fieldset>
      ))}

      {facets.brands.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Marca</legend>
          <div className="flex flex-wrap gap-1.5">
            {facets.brands.map((brand) => (
              <Chip
                key={brand}
                active={params.get("marca") === brand}
                onClick={() => toggleBrand(brand)}
                className="min-h-9 px-3"
              >
                {brand}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {facets.price && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Precio</legend>
          <div className="flex items-center gap-2">
            {(["min", "max"] as const).map((key) => (
              <input
                key={key}
                type="number"
                inputMode="numeric"
                aria-label={key === "min" ? "Precio mínimo" : "Precio máximo"}
                placeholder={String(facets.price![key])}
                defaultValue={params.get(key) ?? ""}
                onBlur={(event) => setPrice(key, event.target.value)}
                className="min-h-10 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-sm tabular-nums outline-brand"
              />
            ))}
          </div>
        </fieldset>
      )}

      {hasFilters && (
        <Button variant="ghost" size="small" onClick={clear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}

export function FilterSheet({ facets }: { facets: Facets }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden">
      <Button variant="outline" size="small" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtros
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Filtros">
        <div className="p-4">
          <FilterPanel facets={facets} />
          <Button className="mt-5 w-full" onClick={() => setOpen(false)}>
            Ver resultados
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
