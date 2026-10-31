// Verificación de punta a punta contra el sistema corriendo (npm run dev).
import { readFileSync } from "node:fs"
import path from "node:path"
import pg from "pg"
import { read, utils } from "xlsx"

const root = path.resolve(import.meta.dirname, "..")
const API = process.env.API_URL || "http://localhost:9000"
const STOREFRONT = process.env.STOREFRONT_URL || "http://localhost:3100"
const SLUG = "sneakerhub-co"
const VENDOR_EMAIL = `admin+${SLUG}@test.com`
const VENDOR_PHONE = "+573001112233"
const CUSTOMER = { name: "Cliente Prueba 1", phone: "+573101112233" }
const NEW_COLOR = "#FF5733"

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

const results = []

async function scenario(name, run) {
  try {
    const detail = await run()
    results.push({ name, ok: true })
    console.log(`✅ ${name}${detail ? ` (${detail})` : ""}`)
  } catch (error) {
    results.push({ name, ok: false })
    console.log(`❌ ${name}\n   ${error.message}`)
  }
}

// El navegador lee el CSV y envía filas; aquí se hace lo mismo con la misma librería.
function csvRows(file) {
  const workbook = read(readFileSync(path.join(root, file), "utf8"), { type: "string" })
  const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    defval: null,
    raw: false,
  })
  return rows.map((row) => ({
    sku: row["SKU"],
    title: row["Nombre"],
    description: row["Descripción"],
    price: row["Precio"],
    stock: row["Stock"],
    image_url: row["Imagen URL"],
    category: row["Categoría"],
    brand: row["Marca"],
    sizes: row["Tallas"],
  }))
}

async function importCsv(vendor, file) {
  const rows = csvRows(file)
  const preview = await call("POST", "/vendor/catalog-imports", vendor, {
    file_name: path.basename(file),
    rows,
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

async function main() {
  const started = Date.now()

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

  const catalog = (query = "limit=100") =>
    call("GET", `/store/catalogs/${SLUG}?${query}`, store)

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
      password: "Test1234!",
    })
    assert(login.status === 200, `HTTP ${login.status}`)
    const auth = { authorization: `Bearer ${login.json.token}` }
    const sellers = await call("GET", "/vendor/sellers", auth)
    const member = sellers.json.seller_members.find((m) => m.seller.handle === SLUG)
    assert(member, `La cuenta no pertenece a ${SLUG}`)
    vendor = { ...auth, "x-seller-id": member.seller_id }
    return VENDOR_EMAIL
  })

  await scenario("Personalización de marca", async () => {
    originalBrand = (await call("GET", "/vendor/brand", vendor)).json.brand
    const { status, name, slug, logo, secondary_color, whatsapp_phone, payment_methods } =
      originalBrand
    assert(status === "open", `Proveedor en estado ${status}`)
    const saved = await call("POST", "/vendor/brand", vendor, {
      name,
      slug,
      logo,
      primary_color: NEW_COLOR,
      secondary_color,
      whatsapp_phone,
      payment_methods,
    })
    assert(saved.status === 200, `HTTP ${saved.status} ${saved.text}`)
    const page = await call("GET", `${STOREFRONT}/${SLUG}`)
    assert(page.status === 200, `Catálogo público: HTTP ${page.status}`)
    assert(
      page.text.toLowerCase().includes(`--brand:${NEW_COLOR.toLowerCase()}`),
      `El HTML público no trae el color ${NEW_COLOR}`
    )
    return `${NEW_COLOR} visible en el catálogo público`
  })

  await scenario("Carga masiva CSV", async () => {
    const { preview, job } = await importCsv(vendor, "fixtures/test-import.csv")
    assert(preview.valid_rows === 5, `${preview.valid_rows} filas válidas, se esperaban 5`)
    assert(job.created_count + job.updated_count === 5, "No se procesaron las 5 filas")
    const { json } = await catalog("q=E2E-&limit=100")
    const found = json.products.filter((p) => /^E2E-000[1-5]$/.test(p.sku))
    assert(found.length === 5, `${found.length} de 5 productos en el catálogo del proveedor`)
    return `${job.created_count} creados, ${job.updated_count} actualizados`
  })

  await scenario("Catálogo público carga", async () => {
    const { json } = await catalog()
    assert(json.count >= 30, `Solo ${json.count} productos`)
    const page = await call("GET", `${STOREFRONT}/${SLUG}?limite=100`)
    assert(page.status === 200, `HTTP ${page.status}`)
    const rendered = json.products.filter((p) => page.text.includes(p.sku) || page.text.includes(p.title))
    assert(rendered.length >= 30, `El HTML solo muestra ${rendered.length} productos`)
    return `${json.count} productos, ${rendered.length} en el HTML`
  })

  await scenario("Selección y creación de pedido", async () => {
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
      items: picks.map((p) => ({ offer_id: p.offer_id, quantity: 1, size: p.sizes[0] })),
    })
    assert(created.status === 202, `HTTP ${created.status} ${created.text}`)
    order = created.json.order
    assert(order.total === total, `Total ${order.total}, se esperaba ${total}`)
    assert(order.status === "pendiente_confirmacion", `Estado ${order.status}`)
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

  await scenario("Producto agotado", async () => {
    const { json } = await catalog()
    const soldOut = json.products.find((p) => p.stock === 0)
    assert(soldOut, "No hay productos agotados")
    const rejected = await call("POST", `/store/catalogs/${SLUG}/orders`, store, {
      idempotency_key: `verify-out-${Date.now()}`,
      customer_name: CUSTOMER.name,
      customer_phone: CUSTOMER.phone,
      items: [{ offer_id: soldOut.offer_id, quantity: 1, size: soldOut.sizes[0] }],
    })
    assert(rejected.status === 400, `HTTP ${rejected.status}: debía rechazarse`)
    assert(/agotado/i.test(rejected.json.message), `Mensaje poco claro: ${rejected.json.message}`)
    return rejected.json.message
  })

  await scenario("Importación con errores", async () => {
    const { preview, job } = await importCsv(vendor, "fixtures/test-import-errors.csv")
    assert(preview.invalid_rows === 1, `${preview.invalid_rows} filas inválidas, se esperaba 1`)
    assert(preview.errors[0].sku === "E2E-0102", "Se rechazó una fila equivocada")
    assert(job.created_count + job.updated_count === 2, "No se procesaron las 2 filas válidas")
    const { json } = await catalog("q=E2E-01&limit=100")
    const skus = json.products.map((p) => p.sku)
    assert(skus.includes("E2E-0101") && skus.includes("E2E-0103"), "Faltan las filas válidas")
    assert(!skus.includes("E2E-0102"), "La fila inválida llegó al catálogo")
    return `fila ${preview.errors[0].row}: ${preview.errors[0].message}`
  })

  // Deja el sistema como estaba: la verificación se puede repetir sin efectos en el demo.
  if (originalBrand) {
    const { status: _status, ...brand } = originalBrand
    await call("POST", "/vendor/brand", vendor, brand)
  }
  await db.end()

  const passed = results.filter((result) => result.ok).length
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const line = "=".repeat(44)
  console.log(`\n${line}`)
  console.log(`RESUMEN: ${passed}/${results.length} escenarios aprobados en ${seconds} s`)
  console.log(passed === results.length ? "RESULTADO: OK" : "RESULTADO: FALLÓ")
  console.log(line)
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
