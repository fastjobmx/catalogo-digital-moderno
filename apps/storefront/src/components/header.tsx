"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Menu, Search, ShoppingBag, X } from "lucide-react"
import type { Vendor } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useCart } from "./cart-context"
import { Sheet } from "./ui/sheet"

export function Header({ vendor, categories }: { vendor: Vendor; categories: string[] }) {
  const { count, setOpen } = useCart()
  const router = useRouter()
  const params = useSearchParams()
  const [term, setTerm] = useState(params.get("q") ?? "")
  const [searching, setSearching] = useState(false)
  const [menu, setMenu] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const typed = useRef(false)

  useEffect(() => {
    if (!typed.current) {
      return
    }
    const timer = setTimeout(() => {
      const search = term ? `?q=${encodeURIComponent(term)}` : ""
      router.replace(`/${vendor.slug}${search}`, { scroll: false })
    }, 300)
    return () => clearTimeout(timer)
  }, [term, router, vendor.slug])

  const openSearch = () => {
    setSearching(true)
    setTimeout(() => input.current?.focus(), 0)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenu(true)}
          className={cn(
            "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-canvas md:hidden",
            searching && "hidden"
          )}
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <Link
          href={`/${vendor.slug}`}
          className={cn(
            "flex min-w-0 items-center gap-2 md:shrink-0",
            searching && "hidden md:flex"
          )}
        >
          {vendor.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.logo} alt="" className="size-9 rounded-full object-cover" />
          )}
          <span className="truncate text-[15px] font-extrabold">{vendor.name}</span>
        </Link>

        <label
          className={cn(
            "relative mx-auto min-w-0 flex-1 md:block md:max-w-md",
            !searching && "hidden"
          )}
        >
          <span className="sr-only">Buscar productos</span>
          <Search
            className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            value={term}
            onChange={(event) => {
              typed.current = true
              setTerm(event.target.value)
            }}
            placeholder="Buscar en el catálogo"
            className="min-h-11 w-full rounded-full border border-line bg-canvas pr-3 pl-10 outline-brand"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center md:ml-0">
          <button
            type="button"
            aria-label={searching ? "Cerrar búsqueda" : "Buscar"}
            onClick={() => (searching ? setSearching(false) : openSearch())}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-canvas md:hidden"
          >
            {searching ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Search className="size-5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            aria-label={`Abrir carrito, ${count} productos`}
            onClick={() => setOpen(true)}
            className="relative -mr-2 flex size-11 items-center justify-center rounded-lg hover:bg-canvas"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground tabular-nums">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <Sheet open={menu} onOpenChange={setMenu} title={vendor.name}>
        <nav className="p-2" aria-label="Menú">
          <Link
            href={`/${vendor.slug}`}
            onClick={() => setMenu(false)}
            className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-canvas"
          >
            Todo el catálogo
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/${vendor.slug}?categoria=${encodeURIComponent(category)}`}
              onClick={() => setMenu(false)}
              className="flex min-h-11 items-center rounded-lg px-3 hover:bg-canvas"
            >
              {category}
            </Link>
          ))}
        </nav>
      </Sheet>
    </header>
  )
}
