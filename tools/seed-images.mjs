// Descarga y optimiza fotos reales del seed. No toca la base de datos.
// Uso: npm run seed:images [-- --force] [-- --vendor=slug]
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(import.meta.dirname, "..")
const outDir = path.join(root, "apps/storefront/public/seed-images")
const manifestPath = path.join(outDir, "manifest.json")
const SIZES = [1200, 600, 300]
const CONCURRENCY = 3
const MIN_SOURCE_WIDTH = 640
const USER_AGENT = "catalogo-digital-seed/1.0 (https://github.com/fastjobmx/catalogo-digital-moderno)"

for (const line of existsSync(path.join(root, "packages/api/.env"))
  ? readFileSync(path.join(root, "packages/api/.env"), "utf8").split(/\r?\n/)
  : []) {
  const match = line.match(/^(PEXELS_API_KEY|UNSPLASH_ACCESS_KEY|PIXABAY_API_KEY)=(.+)$/)
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].trim()
  }
}

const args = process.argv.slice(2)
const force = args.includes("--force")
const onlyVendor = args.find((arg) => arg.startsWith("--vendor="))?.split("=")[1]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchRetry(url, options = {}, attempts = 6) {
  for (let attempt = 0; ; attempt++) {
    let response
    try {
      response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(45_000),
        headers: { "user-agent": USER_AGENT, ...options.headers },
      })
    } catch (error) {
      if (attempt >= attempts) {
        throw error
      }
    }
    if (response?.ok) {
      return response
    }
    const retryable = !response || response.status === 429 || response.status >= 500
    if (!retryable || attempt >= attempts) {
      throw new Error(`HTTP ${response?.status} en ${url.slice(0, 80)}`)
    }
    const retryAfter = Number(response?.headers.get("retry-after")) * 1000
    await sleep(retryAfter || 1000 * 2 ** attempt + Math.random() * 500)
  }
}

const orientation = {
  squarish: { pexels: "square", unsplash: "squarish", pixabay: "all" },
  portrait: { pexels: "portrait", unsplash: "portrait", pixabay: "vertical" },
  landscape: { pexels: "landscape", unsplash: "landscape", pixabay: "horizontal" },
}

const SOURCES = [
  {
    name: "pexels",
    enabled: () => process.env.PEXELS_API_KEY,
    async search(query, shape, perPage) {
      const url = new URL("https://api.pexels.com/v1/search")
      url.search = new URLSearchParams({
        query,
        per_page: perPage,
        orientation: orientation[shape].pexels,
      })
      const response = await fetchRetry(url, {
        headers: { authorization: process.env.PEXELS_API_KEY },
      })
      const { photos = [] } = await response.json()
      return photos.map((photo) => ({
        source: "pexels",
        source_id: String(photo.id),
        source_url: photo.url,
        download_url: photo.src.large2x,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
      }))
    },
  },
  {
    name: "unsplash",
    enabled: () => process.env.UNSPLASH_ACCESS_KEY,
    async search(query, shape, perPage) {
      const url = new URL("https://api.unsplash.com/search/photos")
      url.search = new URLSearchParams({
        query,
        per_page: perPage,
        orientation: orientation[shape].unsplash,
      })
      const response = await fetchRetry(url, {
        headers: { authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      })
      const { results = [] } = await response.json()
      return results.map((photo) => ({
        source: "unsplash",
        source_id: photo.id,
        source_url: photo.links.html,
        download_url: `${photo.urls.raw}&w=1600&q=80&fm=jpg`,
        photographer: photo.user.name,
        photographer_url: photo.user.links.html,
      }))
    },
  },
  {
    name: "pixabay",
    enabled: () => process.env.PIXABAY_API_KEY,
    async search(query, shape, perPage) {
      const url = new URL("https://pixabay.com/api/")
      url.search = new URLSearchParams({
        key: process.env.PIXABAY_API_KEY,
        q: query,
        per_page: Math.max(perPage, 3),
        image_type: "photo",
        orientation: orientation[shape].pixabay,
      })
      const response = await fetchRetry(url)
      const { hits = [] } = await response.json()
      return hits.map((photo) => ({
        source: "pixabay",
        source_id: String(photo.id),
        source_url: photo.pageURL,
        download_url: photo.largeImageURL,
        photographer: photo.user,
        photographer_url: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
      }))
    },
  },
  {
    // Sin key: permite evaluar fotos reales aunque no haya cuentas en los otros bancos.
    name: "wikimedia",
    enabled: () => true,
    bareQuery: true,
    async search(query, _shape, perPage) {
      const url = new URL("https://commons.wikimedia.org/w/api.php")
      url.search = new URLSearchParams({
        action: "query",
        format: "json",
        generator: "search",
        gsrnamespace: "6",
        gsrsearch: `${query} filetype:bitmap`,
        gsrlimit: String(Math.max(perPage * 3, 18)),
        prop: "imageinfo",
        iiprop: "url|size|mime|extmetadata",
        iiurlwidth: "1280",
      })
      const response = await fetchRetry(url)
      const { query: result } = await response.json()
      const pages = Object.values(result?.pages ?? {}).sort((a, b) => a.index - b.index)
      // Commons busca también en descripciones; exigir el sustantivo en el título descarta ruido.
      const stems = query
        .toLowerCase()
        .split(" ")
        .slice(-2)
        .map((word) => word.replace(/s$/, ""))
      return pages.flatMap((page) => {
        if (!stems.some((stem) => page.title.toLowerCase().includes(stem))) {
          return []
        }
        const info = page.imageinfo?.[0]
        const meta = info?.extmetadata ?? {}
        const license = meta.LicenseShortName?.value ?? ""
        const usable =
          info?.mime === "image/jpeg" &&
          info.width >= MIN_SOURCE_WIDTH &&
          info.height >= MIN_SOURCE_WIDTH * 0.6 &&
          /^(cc|public domain|pd)/i.test(license) &&
          !/nc|nd/i.test(license.replace(/^cc/i, ""))
        if (!usable) {
          return []
        }
        const artist = (meta.Artist?.value ?? "Autor desconocido")
          .replace(/<[^>]+>/g, "")
          .trim()
        return [
          {
            source: "wikimedia",
            source_id: String(page.pageid),
            source_url: info.descriptionurl,
            download_url: info.thumburl,
            photographer: artist.slice(0, 120),
            photographer_url: info.descriptionurl,
            license,
          },
        ]
      })
    },
  },
]

const usedIds = new Set()
const searchCache = new Map()

async function candidates(query, suffix, shape) {
  const key = `${query}|${shape}`
  if (searchCache.has(key)) {
    return searchCache.get(key)
  }
  const found = []
  for (const source of SOURCES.filter((item) => item.enabled())) {
    try {
      const text = source.bareQuery ? query : `${query} ${suffix}`.trim()
      found.push(...(await source.search(text, shape, 15)))
    } catch (error) {
      console.warn(`  ${source.name}: ${error.message}`)
    }
    if (found.length >= 8) {
      break
    }
  }
  searchCache.set(key, found)
  return found
}

const ratioSize = { "1:1": [1, 1], "4:5": [4, 5], "4:3": [4, 3], "16:9": [16, 9] }

async function processImage(buffer, relative, ratio) {
  const [w, h] = ratioSize[ratio]
  const dir = path.join(outDir, path.dirname(relative))
  mkdirSync(dir, { recursive: true })
  const base = sharp(buffer, { failOn: "none" }).rotate()

  for (const width of SIZES) {
    const target = path.join(outDir, `${relative}-${width}.webp`)
    await base
      .clone()
      .resize(width, Math.round((width * h) / w), {
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .webp({ quality: 78 })
      .toFile(`${target}.tmp`)
    renameSync(`${target}.tmp`, target)
  }

  const blur = await base
    .clone()
    .resize(20, Math.round((20 * h) / w), { fit: "cover" })
    .webp({ quality: 40 })
    .toBuffer()
  return {
    width: 1200,
    height: Math.round((1200 * h) / w),
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
  }
}

const catalog = JSON.parse(readFileSync(path.join(root, "seed/catalog.json"), "utf8"))
mkdirSync(outDir, { recursive: true })
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { images: [] }

const entryKey = (entry) => `${entry.sku}#${entry.index}`
const byKey = new Map(manifest.images.map((entry) => [entryKey(entry), entry]))
for (const entry of manifest.images) {
  usedIds.add(`${entry.source}:${entry.source_id}`)
}

const stats = { downloaded: 0, cached: 0, failed: 0 }
const placeholderProducts = new Set()

function saveManifest() {
  manifest.images = [...byKey.values()].sort((a, b) =>
    entryKey(a).localeCompare(entryKey(b))
  )
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
}

async function fetchImage({ vendor, sku, index, query, relative, ratio, shape }) {
  const key = `${sku}#${index}`
  const cached = byKey.get(key)
  if (
    !force &&
    cached &&
    existsSync(path.join(outDir, `${relative}-${SIZES[0]}.webp`))
  ) {
    stats.cached += 1
    return true
  }

  // Si la búsqueda exacta se agota, una versión más corta suele traer resultados.
  const words = query.split(" ")
  const queries = [query, words.slice(-2).join(" "), words.at(-1)]
  for (const text of [...new Set(queries)]) {
    for (const photo of await candidates(text, vendor.query_suffix, shape)) {
      const id = `${photo.source}:${photo.source_id}`
      if (usedIds.has(id)) {
        continue
      }
      usedIds.add(id)
      try {
        const response = await fetchRetry(photo.download_url)
        const buffer = Buffer.from(await response.arrayBuffer())
        const details = await processImage(buffer, relative, ratio)
        const { download_url: _url, ...credit } = photo
        byKey.set(key, {
          sku,
          index,
          vendor: vendor.slug,
          path: `/seed-images/${relative}`,
          query,
          ...credit,
          ...details,
        })
        stats.downloaded += 1
        return true
      } catch (error) {
        console.warn(`  ${key}: ${error.message}`)
      }
    }
  }
  stats.failed += 1
  return false
}

const tasks = []
for (const vendor of catalog.vendors) {
  if (onlyVendor && vendor.slug !== onlyVendor) {
    continue
  }
  tasks.push({
    vendor,
    sku: `banner:${vendor.slug}`,
    index: 1,
    query: vendor.banner_query,
    relative: `${vendor.slug}/banner`,
    ratio: "16:9",
    shape: "landscape",
  })
  vendor.products.forEach((product, position) => {
    const sku = `${vendor.prefix}-${String(position + 1).padStart(4, "0")}`
    const count = 2 + (position % 3)
    for (let index = 1; index <= count; index++) {
      tasks.push({
        vendor,
        sku,
        index,
        query: product[5],
        relative: `${vendor.slug}/${sku}-${index}`,
        ratio: vendor.ratio,
        shape: vendor.orientation,
      })
    }
  })
}

console.log(`Fuentes activas: ${SOURCES.filter((s) => s.enabled()).map((s) => s.name).join(", ")}`)
console.log(`Imágenes por resolver: ${tasks.length}`)

// Mismo grupo por producto en orden; la concurrencia es por tarea.
let cursor = 0
let done = 0
async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor++]
    const ok = await fetchImage(task).catch((error) => {
      console.warn(`  ${task.sku}: ${error.message}`)
      stats.failed += 1
      return false
    })
    if (!ok && !task.sku.startsWith("banner") && task.index === 1) {
      placeholderProducts.add(task.sku)
    }
    done += 1
    if (done % 25 === 0) {
      saveManifest()
      console.log(`  ${done}/${tasks.length}`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
saveManifest()

console.log(`
Descargadas:        ${stats.downloaded}
Desde caché:        ${stats.cached}
Fallidas:           ${stats.failed}
Con placeholder:    ${placeholderProducts.size} productos${
  placeholderProducts.size ? ` (${[...placeholderProducts].slice(0, 12).join(", ")})` : ""
}
Manifest:           ${path.relative(root, manifestPath)}`)
