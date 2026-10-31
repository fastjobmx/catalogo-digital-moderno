// Genera CREDITS.md desde el manifest de seed:images.
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const { images } = JSON.parse(
  readFileSync(path.join(root, "apps/storefront/public/seed-images/manifest.json"), "utf8")
)

const clean = (text = "") => text.replace(/\s+/g, " ").replace(/\|/g, "/").trim()
const counts = images.reduce((acc, image) => {
  acc[image.source] = (acc[image.source] ?? 0) + 1
  return acc
}, {})

const lines = [
  "# Créditos de imágenes",
  "",
  "Fotos del catálogo de prueba, generado por `npm run seed:credits` desde el manifest de `npm run seed:images`.",
  "Pexels, Unsplash y Pixabay agradecen la atribución. Las fotos de Wikimedia Commons la exigen: cada fila indica autor, licencia y enlace.",
  "Son solo para demostración: los productos no corresponden a los artículos fotografiados.",
  "",
  ...Object.entries(counts).map(([source, count]) => `- ${source}: ${count}`),
  "",
  "| SKU | Fuente | Autor | Licencia | Enlace |",
  "| --- | --- | --- | --- | --- |",
  ...images.map(
    (image) =>
      `| ${image.sku}#${image.index} | ${image.source} | ${clean(image.photographer)} | ${
        clean(image.license) || image.source
      } | [ver](${image.source_url}) |`
  ),
  "",
]
writeFileSync(path.join(root, "CREDITS.md"), lines.join("\n"))
console.log(`CREDITS.md: ${images.length} imágenes`)
