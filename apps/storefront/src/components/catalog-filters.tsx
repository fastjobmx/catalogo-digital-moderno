"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  categories: string[]
  query?: string
  category?: string
}

export function CatalogFilters({ categories, query = "", category }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [term, setTerm] = useState(query)
  const [, startTransition] = useTransition()

  const go = (next: { q?: string; categoria?: string }) => {
    const search = new URLSearchParams()
    if (next.q) search.set("q", next.q)
    if (next.categoria) search.set("categoria", next.categoria)
    startTransition(() =>
      router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { scroll: false })
    )
  }

  useEffect(() => {
    if (term === query) {
      return
    }
    const timer = setTimeout(() => go({ q: term, categoria: category }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  const chip = (label: string, value?: string) => {
    const active = category === value
    return (
      <button
        key={label}
        type="button"
        aria-pressed={active}
        onClick={() => go({ q: term, categoria: value })}
        className={cn(
          "min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium",
          active
            ? "border-brand bg-brand text-brand-foreground"
            : "border-line bg-surface text-ink"
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="sticky top-0 z-20 mb-3 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-3">
        <label className="relative block">
          <span className="sr-only">Buscar productos</span>
          <Search
            className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por nombre o referencia"
            className="min-h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 outline-brand"
          />
        </label>
        {categories.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {chip("Todo")}
            {categories.map((name) => chip(name, name))}
          </div>
        )}
      </div>
    </div>
  )
}
