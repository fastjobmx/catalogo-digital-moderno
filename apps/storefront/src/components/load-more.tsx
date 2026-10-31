"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "./ui/button"

export function LoadMore({ nextLimit }: { nextLimit: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const loadMore = () => {
    const search = new URLSearchParams(searchParams)
    search.set("limite", String(nextLimit))
    startTransition(() => router.replace(`${pathname}?${search}`, { scroll: false }))
  }

  return (
    <div className="mt-5 flex justify-center">
      <Button variant="outline" onClick={loadMore} disabled={pending}>
        {pending ? "Cargando…" : "Ver más productos"}
      </Button>
    </div>
  )
}
