"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Chip } from "./ui/chip"

export function CategoryChips({ categories }: { categories: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const current = params.get("categoria") ?? undefined

  const select = (category?: string) => {
    const search = new URLSearchParams()
    if (category) {
      search.set("categoria", category)
    }
    startTransition(() =>
      router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { scroll: false })
    )
  }

  if (!categories.length) {
    return null
  }

  return (
    <nav
      aria-label="Categorías"
      className="sticky top-16 z-20 border-b border-line bg-canvas/95 backdrop-blur"
    >
      <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5">
        <Chip active={!current} onClick={() => select()}>
          Todo
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            active={current === category}
            onClick={() => select(category)}
          >
            {category}
          </Chip>
        ))}
      </div>
    </nav>
  )
}
