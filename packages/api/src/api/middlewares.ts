import { defineMiddlewares } from "@medusajs/medusa"

export default defineMiddlewares({
  routes: [
    {
      // El archivo de 10 MB llega como JSON ya parseado en el navegador.
      matcher: "/vendor/catalog-imports",
      method: ["POST"],
      bodyParser: { sizeLimit: "24mb" },
    },
    {
      // La firma de Meta se calcula sobre el cuerpo exacto.
      matcher: "/webhooks/whatsapp",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
  ],
})
