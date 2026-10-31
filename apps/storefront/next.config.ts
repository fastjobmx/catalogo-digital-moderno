import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Tapaba la barra de compra móvil en desarrollo y en las capturas.
  devIndicators: false,
  // Permite compilar producción sin pisar el servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
}

export default nextConfig
