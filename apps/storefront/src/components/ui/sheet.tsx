"use client"

import type { ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/** Hoja inferior en celular; panel lateral desde tablet. */
export function Sheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-surface text-ink md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:max-w-md md:rounded-none"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <Dialog.Title className="truncate text-base font-extrabold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-canvas"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
