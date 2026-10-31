import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import type { ProductOption } from "../lib/catalog-read"
import type { RawImportRow } from "../lib/import-rows"

type ProductTuple = [
  name: string,
  category: string,
  subcategory: string,
  brand: string,
  price: number,
  imageQuery: string,
  phrase: string,
]

export type VendorSeed = {
  name: string
  slug: string
  prefix: string
  rubro: string
  primary: string
  secondary: string
  ratio: string
  description: string
  city: string
  province: string
  address: string
  postal: string
  instagram: string
  whatsapp: string
  hours: string
  delivery: string
  owner: [string, string]
  payments: { name: string; detail?: string }[]
  closing: string
  notice?: string
  options: Record<string, ProductOption[]>
  products: ProductTuple[]
}

type ManifestEntry = {
  sku: string
  index: number
  path: string
  blurDataURL: string
}

export const SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD || "Test1234!"

export const CUSTOMERS = [
  { name: "Cliente Prueba 1", phone: "+573101112233", email: "cliente1@test.com" },
  { name: "Cliente Prueba 2", phone: "+573104445566", email: "cliente2@test.com" },
  { name: "Cliente Prueba 3", phone: "+573107778899", email: "cliente3@test.com" },
]

const ROOT = path.resolve(process.cwd(), "../..")
const PUBLIC_DIR = path.join(ROOT, "apps/storefront/public")
const ASSET_BASE = process.env.SEED_ASSET_BASE_URL || "http://localhost:3100"

export const VENDORS: VendorSeed[] = JSON.parse(
  readFileSync(path.join(ROOT, "seed/catalog.json"), "utf8")
).vendors

/** Solo lee el manifest: el seed nunca descarga nada. */
export function loadManifest(): ManifestEntry[] | null {
  const file = path.join(PUBLIC_DIR, "seed-images/manifest.json")
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).images : null
}

function assetUrl(relative: string) {
  return `${ASSET_BASE}/${relative}`
}

function writeAsset(relative: string, content: string) {
  const file = path.join(PUBLIC_DIR, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
  return assetUrl(relative)
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")

export function writeLogo(vendor: VendorSeed) {
  const initials = vendor.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
  return writeAsset(
    `brand/${vendor.slug}/logo.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${vendor.primary}"/><circle cx="60" cy="60" r="52" fill="none" stroke="${vendor.secondary}" stroke-width="3"/><text x="60" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="42" fill="${vendor.secondary}">${initials}</text></svg>`
  )
}

const RATIO_SIZE: Record<string, [number, number]> = {
  "1:1": [600, 600],
  "4:5": [600, 750],
  "4:3": [600, 450],
}

function writePlaceholder(vendor: VendorSeed, sku: string, title: string) {
  const [width, height] = RATIO_SIZE[vendor.ratio]
  return writeAsset(
    `brand/${vendor.slug}/placeholders/${sku}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${vendor.primary}"/><foreignObject x="40" y="${height / 2 - 60}" width="${width - 80}" height="120"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 32px Arial,sans-serif;color:#fff;text-align:center">${escapeXml(title)}</div></foreignObject></svg>`
  )
}

export function bannerFor(vendor: VendorSeed, manifest: ManifestEntry[] | null) {
  const entry = manifest?.find((item) => item.sku === `banner:${vendor.slug}`)
  return entry
    ? { url: assetUrl(`${entry.path.slice(1)}-1200.webp`), blur: entry.blurDataURL }
    : { url: null, blur: null }
}

// Hash determinista: el seed produce los mismos datos en cualquier máquina.
export function hash(text: string): number {
  let value = 2166136261
  for (const char of text) {
    value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  }
  return (value >>> 0) / 4294967296
}

export type SeedRow = { raw: RawImportRow; extra: Record<string, unknown> }

export function buildProductRows(
  vendor: VendorSeed,
  manifest: ManifestEntry[] | null
): SeedRow[] {
  return vendor.products.map((product, index) => {
    const [title, category, subcategory, brand, price, , phrase] = product
    const sku = `${vendor.prefix}-${String(index + 1).padStart(4, "0")}`
    const options = vendor.options[category] ?? vendor.options["*"]

    const photos = (manifest ?? [])
      .filter((entry) => entry.sku === sku)
      .sort((a, b) => a.index - b.index)
    const urls = photos.map((entry) => assetUrl(`${entry.path.slice(1)}-1200.webp`))
    if (!urls.length) {
      urls.push(writePlaceholder(vendor, sku, title))
    }

    const soldOut = index % 9 === 4
    const onSale = index % 6 === 2
    const firstOption = options[0].values

    return {
      raw: {
        sku,
        title,
        description: `${phrase} ${vendor.closing}`,
        price,
        stock: soldOut ? 0 : 1 + Math.floor(hash(`${sku}:stock`) * 25),
        image_url: urls[0],
        images: urls.join("|"),
        category,
        brand,
        compare_at_price: onSale
          ? Math.floor((price * 1.25) / 10000) * 10000 + 9900
          : null,
        is_featured: index % 7 === 0 ? "si" : "no",
      },
      extra: {
        subcategory,
        options,
        sold_out_options:
          index % 5 === 3 && firstOption.length > 1 ? [firstOption.at(-1)] : [],
        notice: vendor.notice ?? null,
        blur: photos.map((entry) => entry.blurDataURL),
        is_new: index % 7 === 1,
        is_best_seller: index % 8 === 3 && !soldOut,
      },
    }
  })
}
