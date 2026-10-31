import type { ReactNode } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CartDrawer } from "@/components/cart-drawer"
import { CartProvider } from "@/components/cart-context"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { getCatalog } from "@/lib/api"
import { readableOn } from "@/lib/utils"

type Props = {
  params: Promise<{ slug: string }>
  children: ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const catalog = await getCatalog(slug, { limit: 1 })
  return catalog
    ? {
        title: `${catalog.vendor.name} | Catálogo`,
        description: catalog.vendor.description ?? undefined,
      }
    : { title: "Catálogo no disponible" }
}

export default async function VendorLayout({ params, children }: Props) {
  const { slug } = await params
  const catalog = await getCatalog(slug, { limit: 1 })
  if (!catalog) {
    notFound()
  }

  const { vendor, categories } = catalog
  // En :root y no en un div: carrito y filtros se renderizan en <body>, fuera del layout.
  const theme = `:root{--brand-primary:${vendor.primary_color};--brand-on-primary:${readableOn(
    vendor.primary_color
  )};--brand-secondary:${vendor.secondary_color};--brand-on-secondary:${readableOn(
    vendor.secondary_color
  )}}`

  return (
    <div className="flex min-h-dvh flex-col">
      <style dangerouslySetInnerHTML={{ __html: theme }} />
      <CartProvider slug={vendor.slug}>
        <Header vendor={vendor} categories={categories} />
        <div className="flex-1">{children}</div>
        <Footer vendor={vendor} />
        <WhatsAppButton vendor={vendor} />
        <CartDrawer vendor={vendor} />
      </CartProvider>
    </div>
  )
}
