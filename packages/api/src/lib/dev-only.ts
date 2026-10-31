import type { MedusaResponse } from "@medusajs/framework/http"

/** Rutas de desarrollo: en producción responden 404, como si no existieran. */
export function blockInProduction(res: MedusaResponse): boolean {
  if (process.env.NODE_ENV === "production") {
    res.sendStatus(404)
    return true
  }
  return false
}
