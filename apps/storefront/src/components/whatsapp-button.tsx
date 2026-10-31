"use client"

import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import type { Vendor } from "@/lib/api"
import { whatsappLink } from "@/lib/utils"

export function WhatsAppButton({ vendor }: { vendor: Vendor }) {
  const pathname = usePathname()
  if (!vendor.whatsapp_phone) {
    return null
  }
  // En el detalle móvil la barra fija de compra ocupa ese espacio.
  const onDetail = pathname.includes("/p/")

  return (
    <a
      href={whatsappLink(vendor.whatsapp_phone, `Hola ${vendor.name}, tengo una pregunta.`)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Escribir a ${vendor.name} por WhatsApp`}
      className={`fixed right-4 z-20 size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-card-hover transition-transform duration-200 hover:scale-105 ${
        onDetail ? "bottom-4 hidden md:flex" : "bottom-4 flex"
      }`}
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  )
}
