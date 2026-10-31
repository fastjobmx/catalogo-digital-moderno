// Verificación de punta a punta contra el sistema corriendo (npm run dev).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { chromium } from "playwright"
import pg from "pg"
import { read, utils } from "xlsx"

const root = path.resolve(import.meta.dirname, "..")
const API = process.env.API_URL || "http://localhost:9000"
const STOREFRONT = process.env.STOREFRONT_URL || "http://localhost:3100"
const PANEL = process.env.PANEL_URL || "http://localhost:7001"
const SLUG = "sneakerhub-co"
const VENDOR_EMAIL = `admin+${SLUG}@test.com`
const PASSWORD = "Test1234!"
const VENDOR_PHONE = "+573001112233"
const CUSTOMER = { name: "Cliente Prueba 1", phone: "+573101112233" }
const NEW_COLOR = "#FF5733"
const SEED = JSON.parse(readFileSync(path.join(root, "seed/catalog.json"), "utf8"))
const SHOTS = path.join(root, "screenshots")

const envValue = (file, name) =>
  readFileSync(path.join(root, file), "utf8").match(new RegExp(`^${name}=(.*)$`, "m"))?.[1].trim()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function call(method, url, headers = {}, body) {
  const response = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = undefined
  }
  return { status: response.status, json, text }
}

/** Primera combinación disponible, en el formato "M / Negro" que espera el pedido. */
const variantOf = (product) =>
  product.options
    .map(
      (option) =>
        option.values.find((value) => !product.sold_out_options.includes(value)) ??
        option.values[0]
    )
    .join(" / ") || null

const results = []
const stats = { vendors: 0, products: 0, images: 0, placeholders: 0, shots: 0 }

async function scenario(name, run) {
  try {
    const detail = await run()
    results.push({ name, ok: true })
    console.log(`✅ ${results.length}. ${name}${detail ? ` (${detail})` : ""}`)
  } catch (error) {
    results.push({ name, ok: false })
    console.log(`❌ ${results.length}. ${name}\n   ${error.message}`)
  }
}

// El navegador lee el CSV y envía filas; aquí se hace lo mismo con la misma librería.
function csvRows(file) {
  const workbook = read(readFileSync(path.join(root, file), "utf8"), { type: "string" })
  const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    defval: null,
    raw: false,
  })
  return rows.map(({ name, ...row }) => ({ ...row, title: name }))
}

async function importCsv(vendor, file) {
  const preview = await call("POST", "/vendor/catalog-imports", vendor, {
    file_name: path.basename(file),
    rows: csvRows(file),
  })
  assert(preview.status === 201, `Previsualización: HTTP ${preview.status} ${preview.text}`)
  const id = preview.json.import.id
  const confirm = await call("POST", `/vendor/catalog-imports/${id}`, vendor)
  assert(confirm.status === 202, `Confirmación: HTTP ${confirm.status}`)
  for (let i = 0; i < 60; i++) {
    const { json } = await call("GET", `/vendor/catalog-imports/${id}`, vendor)
    if (json.import.status === "completed") {
      return { preview: preview.json.import, job: json.import }
    }
    assert(json.import.status !== "failed", "La importación terminó como fallida")
    await sleep(500)
  }
  throw new Error("La importación no terminó a tiempo")
}

async function checkUrls(urls) {
  const queue = [...new Set(urls)]
  const broken = []
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (queue.length) {
        const url = queue.pop()
        const response = await fetch(url, { method: "HEAD" }).catch(() => null)
        if (!response?.ok) {
          broken.push(url)
        }
      }
    })
  )
  return broken
}

async function buyFromInterface(store) {
  const { json } = await call("GET", `/store/catalogs/${SLUG}?limit=100`, store)
  const product = json.products.find(
    (p) => p.stock > 0 && !p.sku.startsWith("E2E-") && !p.sold_out_options.length
  )
  const browser = await chromium.launch({ channel: "chromium" })
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    // No sale a internet: basta con ver a qué dirección intenta ir la ventana nueva.
    await context.route("https://wa.me/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "wa.me" })
    )
    const page = await context.newPage()
    await page.goto(`${STOREFRONT}/${SLUG}/p/${encodeURIComponent(product.sku)}`)
    for (const option of product.options) {
      await page.getByRole("button", { name: option.values[0], exact: true }).click()
    }
    await page.getByRole("button", { name: "Añadir al carrito" }).click()
    await page.locator("[name=name]").fill(CUSTOMER.name)
    await page.locator("[name=phone]").fill(CUSTOMER.phone)
    const popup = page.waitForEvent("popup")
    await page.getByRole("button", { name: "Enviar pedido por WhatsApp" }).click()
    const whatsapp = await popup
    await whatsapp.waitForURL(/wa\.me/, { timeout: 15_000 })
    const url = decodeURIComponent(whatsapp.url())
    assert(url.includes("wa.me/573001112233"), "No abrió el WhatsApp del comercio")
    assert(url.includes(product.title), "El mensaje no trae el producto")
    await page.getByText("Abrir WhatsApp de nuevo").waitFor({ timeout: 10_000 })
    const primary = await page.evaluate(() =>
      getComputedStyle(document.querySelector("[role=dialog]")).getPropertyValue("--brand-primary")
    )
    assert(primary.trim().toLowerCase() === "#111827", `Color en el carrito: ${primary}`)
    return "ventana nueva a wa.me con el pedido"
  } finally {
    await browser.close()
  }
}

async function captureScreenshots(store) {
  rmSync(SHOTS, { recursive: true, force: true })
  mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ channel: "chromium" })
  const sizes = {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1440, height: 900 },
  }
  const shots = []
  const overflow = []

  const capture = async (page, file, url, label) => {
    await page.goto(url, { waitUntil: "networkidle" })
    await page.waitForTimeout(400)
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
      overflow.push(file)
    }
    await page.screenshot({ path: path.join(SHOTS, file) })
    shots.push({ file, label })
  }

  for (const [device, viewport] of Object.entries(sizes)) {
    const page = await browser.newPage({ viewport })
    for (const vendor of SEED.vendors) {
      const { json } = await call("GET", `/store/catalogs/${vendor.slug}?limit=100`, store)
      const product = json.products.find((p) => p.stock > 0 && p.is_featured) ?? json.products[0]
      await capture(
        page,
        `${vendor.slug}-home-${device}.png`,
        `${STOREFRONT}/${vendor.slug}`,
        `${vendor.name}: inicio (${device})`
      )
      await capture(
        page,
        `${vendor.slug}-detalle-${device}.png`,
        `${STOREFRONT}/${vendor.slug}/p/${encodeURIComponent(product.sku)}`,
        `${vendor.name}: detalle (${device})`
      )
    }
    await page.close()
  }

  const panel = await browser.newPage({ viewport: sizes.desktop })
  await panel.goto(PANEL, { waitUntil: "domcontentloaded" })
  await panel.getByLabel("Email").fill(VENDOR_EMAIL)
  await panel.getByLabel("Password").fill(PASSWORD)
  await panel.getByRole("button", { name: "Log in" }).click()
  await panel.getByText("SneakerHub CO").first().click({ timeout: 20_000 })
  // Tras entrar se aterriza en Pedidos: ahí deben estar los pedidos del catálogo.
  await panel.getByText(CUSTOMER.name).first().waitFor({ timeout: 20_000 })
  await panel.screenshot({ path: path.join(SHOTS, "panel-pedidos-desktop.png") })
  shots.push({ file: "panel-pedidos-desktop.png", label: "Panel: pedidos" })
  await panel.getByText("Resumen", { exact: true }).first().click({ timeout: 20_000 })
  await panel.getByText("Últimos pedidos").waitFor({ timeout: 20_000 })
  await panel.screenshot({ path: path.join(SHOTS, "panel-dashboard-desktop.png") })
  shots.push({ file: "panel-dashboard-desktop.png", label: "Panel: resumen" })
  await browser.close()

  writeFileSync(
    path.join(SHOTS, "index.html"),
    `<!doctype html><html lang="es"><meta charset="utf-8"><title>Capturas</title>
<style>body{font:14px system-ui;margin:24px;background:#f8f9fa;color:#212529}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
figure{margin:0;background:#fff;border-radius:12px;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,.05)}
img{width:100%;border-radius:8px;display:block}figcaption{padding:6px 2px 0;font-weight:600}</style>
<h1>Capturas de verificación</h1><main>${shots
      .map(
        (s) =>
          `<figure><a href="${s.file}"><img src="${s.file}" alt="${s.label}" loading="lazy"></a><figcaption>${s.label}</figcaption></figure>`
      )
      .join("")}</main></html>`
  )
  stats.shots = shots.length
  assert(!overflow.length, `Scroll horizontal en: ${overflow.join(", ")}`)
  return `${shots.length} capturas`
}

async function main() {
  const health = await fetch(`${API}/health`).catch(() => null)
  if (!health?.ok) {
    console.error(`No hay backend en ${API}. Arráncalo primero con: npm run dev`)
    process.exit(1)
  }

  const store = {
    "x-publishable-api-key": envValue("apps/storefront/.env.local", "MEDUSA_PUBLISHABLE_KEY"),
  }
  const db = new pg.Client(envValue("packages/api/.env", "DATABASE_URL"))
  await db.connect()

  const catalog = (query = "limit=100", slug = SLUG) =>
    call("GET", `/store/catalogs/${slug}?${query}`, store)

  const findOutbox = async (to, displayId) => {
    for (let i = 0; i < 40; i++) {
      const { rows } = await db.query(
        `select * from whatsapp_outbox
         where "to" = $1 and status = 'sent' and payload->>'body' ~ $2
         order by created_at desc limit 1`,
        [to, `#${displayId}([^0-9]|$)`]
      )
      if (rows[0]) {
        return rows[0]
      }
      await sleep(500)
    }
    throw new Error(`No hay mensaje en whatsapp_outbox para ${to} del pedido #${displayId}`)
  }

  console.log("\nVerificación end-to-end\n")

  let vendor
  let originalBrand
  let order
  let orderLines

  await scenario("Login del proveedor", async () => {
    const login = await call("POST", "/auth/member/emailpass", {}, {
      email: VENDOR_EMAIL,
      password: PASSWORD,
    })
    assert(login.status === 200, `HTTP ${login.status}`)
    const auth = { authorization: `Bearer ${login.json.token}` }
    const sellers = await call("GET", "/vendor/sellers", auth)
    const member = sellers.json.seller_members.find((m) => m.seller.handle === SLUG)
    assert(member, `La cuenta no pertenece a ${SLUG}`)
    vendor = { ...auth, "x-seller-id": member.seller_id }
    return VENDOR_EMAIL
  })

  await scenario("Cambio de color visible en el catálogo", async () => {
    originalBrand = (await call("GET", "/vendor/brand", vendor)).json.brand
    const { status, ...brand } = originalBrand
    assert(status === "open", `Proveedor en estado ${status}`)
    const saved = await call("POST", "/vendor/brand", vendor, {
      ...brand,
      primary_color: NEW_COLOR,
    })
    assert(saved.status === 200, `HTTP ${saved.status} ${saved.text}`)
    const page = await call("GET", `${STOREFRONT}/${SLUG}`)
    assert(page.status === 200, `Catálogo público: HTTP ${page.status}`)
    assert(
      page.text.toLowerCase().includes(`--brand-primary:${NEW_COLOR.toLowerCase()}`),
      `El HTML público no trae el color ${NEW_COLOR}`
    )
    return `${NEW_COLOR} en el HTML público`
  })

  await scenario("Carga de test-import.csv", async () => {
    const { preview, job } = await importCsv(vendor, "fixtures/test-import.csv")
    assert(preview.valid_rows === 5, `${preview.valid_rows} filas válidas, se esperaban 5`)
    assert(job.created_count + job.updated_count === 5, "No se procesaron las 5 filas")
    const { json } = await catalog("q=E2E-&limit=100")
    const found = json.products.filter((p) => /^E2E-000[1-5]$/.test(p.sku))
    assert(found.length === 5, `${found.length} de 5 productos en el catálogo del proveedor`)
    return `${job.created_count} creados, ${job.updated_count} actualizados`
  })

  await scenario("Catálogo público de SneakerHub", async () => {
    const { json } = await catalog()
    assert(json.count >= 20, `Solo ${json.count} productos`)
    const page = await call("GET", `${STOREFRONT}/${SLUG}?limite=100`)
    assert(page.status === 200, `HTTP ${page.status}`)
    const rendered = json.products.filter((p) => page.text.includes(p.title))
    assert(rendered.length >= 20, `El HTML solo muestra ${rendered.length} productos`)
    return `${json.count} productos`
  })

  await scenario("Los 8 proveedores responden", async () => {
    const summary = []
    for (const { slug, products } of SEED.vendors) {
      const page = await call("GET", `${STOREFRONT}/${slug}`)
      assert(page.status === 200, `/${slug}: HTTP ${page.status}`)
      const { json } = await catalog("limit=100", slug)
      assert(json.count >= 20, `/${slug}: solo ${json.count} productos`)
      assert(json.count >= products.length, `/${slug}: faltan productos del seed`)
      stats.vendors += 1
      summary.push(json.count)
    }
    return summary.join(", ")
  })

  await scenario("Imágenes del seed", async () => {
    const urls = []
    for (const { slug, prefix } of SEED.vendors) {
      const { json } = await catalog("limit=100", slug)
      const seeded = json.products.filter((p) => p.sku.startsWith(`${prefix}-`))
      stats.products += seeded.length
      for (const product of seeded) {
        assert(product.images.length > 0, `${product.sku} no tiene imagen`)
        stats.placeholders += product.images.some((url) => url.endsWith(".svg")) ? 1 : 0
        urls.push(...product.images)
      }
      if (json.vendor.banner) {
        urls.push(json.vendor.banner)
      }
      urls.push(json.vendor.logo)
    }
    stats.images = urls.length
    const broken = await checkUrls(urls)
    assert(!broken.length, `${broken.length} rotas, por ejemplo ${broken[0]}`)
    return `${urls.length} URLs 200, ${stats.placeholders} productos con placeholder`
  })

  await scenario("Pedido con 3 productos", async () => {
    const { json } = await catalog()
    const picks = json.products
      .filter((p) => p.stock > 0 && !p.sku.startsWith("E2E-"))
      .slice(0, 3)
    assert(picks.length === 3, "No hay 3 productos con stock")
    orderLines = picks
    const total = picks.reduce((sum, p) => sum + p.price, 0)
    const created = await call("POST", `/store/catalogs/${SLUG}/orders`, store, {
      idempotency_key: `verify-${Date.now()}`,
      customer_name: CUSTOMER.name,
      customer_phone: CUSTOMER.phone,
      customer_address: "Calle de prueba 123",
      items: picks.map((p) => ({ offer_id: p.offer_id, quantity: 1, size: variantOf(p) })),
    })
    assert(created.status === 202, `HTTP ${created.status} ${created.text}`)
    order = created.json.order
    assert(order.total === total, `Total ${order.total}, se esperaba ${total}`)
    assert(order.status === "pendiente_confirmacion", `Estado ${order.status}`)
    const link = decodeURIComponent(created.json.whatsapp_url ?? "")
    assert(link.startsWith("https://wa.me/573001112233?text="), "Falta el enlace al comercio")
    for (const product of picks) {
      assert(link.includes(product.title), `El enlace no trae ${product.title}`)
    }
    assert(link.includes(CUSTOMER.name), "El enlace no trae los datos del cliente")
    return `pedido #${order.display_id}`
  })

  await scenario("WhatsApp al proveedor", async () => {
    const row = await findOutbox(VENDOR_PHONE, order.display_id)
    const missing = orderLines.filter((p) => !row.payload.body.includes(p.title))
    assert(!missing.length, `Faltan productos en el resumen: ${missing.map((p) => p.title)}`)
    assert(row.payload.body.includes(CUSTOMER.name), "Falta el cliente en el resumen")
    return `${row.template} a ${row.to}`
  })

  await scenario("WhatsApp al cliente", async () => {
    const row = await findOutbox(CUSTOMER.phone, order.display_id)
    const total = new Intl.NumberFormat("es-CO").format(order.total)
    assert(row.payload.body.includes(total), `Falta el total ${total}`)
    for (const method of originalBrand.payment_methods) {
      assert(row.payload.body.includes(method.name), `Falta el medio de pago ${method.name}`)
    }
    return `${row.template} a ${row.to}`
  })

  await scenario("Producto con stock 0", async () => {
    const { json } = await catalog()
    const soldOut = json.products.find((p) => p.stock === 0)
    assert(soldOut, "No hay productos agotados")
    const rejected = await call("POST", `/store/catalogs/${SLUG}/orders`, store, {
      idempotency_key: `verify-out-${Date.now()}`,
      customer_name: CUSTOMER.name,
      customer_phone: CUSTOMER.phone,
      items: [{ offer_id: soldOut.offer_id, quantity: 1, size: variantOf(soldOut) }],
    })
    assert(rejected.status === 400, `HTTP ${rejected.status}: debía rechazarse`)
    assert(/agotado/i.test(rejected.json.message), `Mensaje poco claro: ${rejected.json.message}`)
    return rejected.json.message
  })

  await scenario("Importación con errores", async () => {
    const { preview, job } = await importCsv(vendor, "fixtures/test-import-with-errors.csv")
    assert(preview.invalid_rows === 2, `${preview.invalid_rows} filas inválidas, se esperaban 2`)
    assert(job.created_count + job.updated_count === 3, "No se procesaron las 3 filas válidas")
    const { json } = await catalog("q=E2E-01&limit=100")
    const skus = json.products.map((p) => p.sku)
    for (const sku of ["E2E-0101", "E2E-0103", "E2E-0104"]) {
      assert(skus.includes(sku), `Falta ${sku}`)
    }
    assert(!skus.includes("E2E-0102"), "La fila inválida llegó al catálogo")
    return preview.errors.map((e) => `fila ${e.row}: ${e.message}`).join("; ")
  })

  // El color se restaura antes de las capturas y aunque algo haya fallado antes.
  if (originalBrand) {
    const { status: _status, ...brand } = originalBrand
    await call("POST", "/vendor/brand", vendor, brand)
  }
  await db.end()

  await scenario("Compra en la interfaz abre el WhatsApp del comercio", () =>
    buyFromInterface(store)
  )
  await scenario("Capturas visuales", () => captureScreenshots(store))

  const passed = results.filter((result) => result.ok).length
  const ok = passed === results.length
  const line = "═".repeat(46)
  console.log(`\n${line}`)
  console.log(` VERIFICACIÓN E2E — ${passed}/${results.length} ${ok ? "✅" : "❌"}`)
  console.log(
    ` Proveedores: ${stats.vendors} | Productos: ${stats.products} | Imágenes: ${stats.images} (${stats.placeholders} placeholder)`
  )
  console.log(` Capturas: /screenshots/index.html (${stats.shots})`)
  console.log(line)
  process.exit(ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
