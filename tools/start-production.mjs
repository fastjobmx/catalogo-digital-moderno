// Arranque del backend en el hosting: migra, siembra una sola vez e inicia el servidor compilado.
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import pg from "pg"

const api = path.resolve(import.meta.dirname, "../packages/api")
const medusa = path.resolve(
  import.meta.dirname,
  "../node_modules/.bin",
  process.platform === "win32" ? "medusa.exe" : "medusa"
)

// El plan gratis da 512 MB: mejor recolectar basura antes que morir por memoria.
process.env.NODE_OPTIONS = "--max-old-space-size=420"

// Render publica su URL; los paneles viven en el mismo dominio que la API.
const publicUrl = process.env.RENDER_EXTERNAL_URL
if (publicUrl) {
  const defaults = {
    ADMIN_CORS: publicUrl,
    VENDOR_CORS: publicUrl,
    AUTH_CORS: publicUrl,
    STORE_CORS: process.env.STOREFRONT_URL ?? publicUrl,
    MERCUR_VENDOR_URL: `${publicUrl}/seller`,
    FILE_BACKEND_URL: `${publicUrl}/static`,
  }
  for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value
  }
}

function run(args, { optional = false } = {}) {
  const result = spawnSync(medusa, args, { cwd: api, stdio: "inherit" })
  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1)
  }
}

async function databaseIsEmpty() {
  const db = new pg.Client(process.env.DATABASE_URL)
  await db.connect()
  const { rows } = await db.query("select count(*)::int as total from seller")
  await db.end()
  return rows[0].total === 0
}

run(["db:migrate"])

// Solo la primera vez: el seed restablece la marca de los comercios de prueba.
if (await databaseIsEmpty()) {
  run(["exec", "./src/scripts/seed.ts"])
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    run(["user", "-e", process.env.ADMIN_EMAIL, "-p", process.env.ADMIN_PASSWORD], {
      optional: true,
    })
  }
}

spawn(medusa, ["start"], {
  cwd: path.join(api, ".medusa/server"),
  stdio: "inherit",
}).on("exit", (code) => process.exit(code ?? 0))
