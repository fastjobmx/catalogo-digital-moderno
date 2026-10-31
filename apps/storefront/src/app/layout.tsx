import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"

const font = Manrope({ subsets: ["latin"], variable: "--font-manrope" })

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Catálogo digital de proveedores",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={font.variable}>
      <body>{children}</body>
    </html>
  )
}
