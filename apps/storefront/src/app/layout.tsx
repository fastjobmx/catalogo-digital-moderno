import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"

const font = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

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
