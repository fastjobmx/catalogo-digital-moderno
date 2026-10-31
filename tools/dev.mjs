// Arranque de un solo comando: base de datos, primera instalación y todas las apps.
import { spawn, spawnSync } from "node:child_process"
import { copyFileSync, existsSync } from "node:fs"
import net from "node:net"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const bin = (name) =>
  path.join(root, "node_modules/.bin", process.platform === "win32" ? `${name}.exe` : name)

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: "localhost" })
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("error", () => resolve(false))
  })

async function waitForPort(port, seconds) {
  for (let i = 0; i < seconds; i++) {
    if (await isPortOpen(port)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Postgres no respondió en el puerto ${port}`)
}

function runApi(args) {
  const result = spawnSync(bin("medusa"), args, {
    cwd: path.join(root, "packages/api"),
    stdio: "inherit",
    env: { ...process.env, MERCUR_DISABLE_TELEMETRY: "true" },
  })
  if (result.status !== 0) {
    throw new Error(`Falló: medusa ${args.join(" ")}`)
  }
}

const envFile = path.join(root, "packages/api/.env")
if (!existsSync(envFile)) {
  copyFileSync(path.join(root, ".env.example"), envFile)
}

let database
if (!(await isPortOpen(54329))) {
  console.log("Iniciando Postgres...")
  database = spawn(process.execPath, ["tools/dev-db.mjs"], { cwd: root, stdio: "inherit" })
  await waitForPort(54329, 90)
  // El puerto abre un instante antes de que exista la base en el primer arranque.
  await new Promise((resolve) => setTimeout(resolve, 3000))
}

// La clave del storefront la escribe el seed: si no está, falta la primera instalación.
if (!existsSync(path.join(root, "apps/storefront/.env.local"))) {
  console.log("Primera instalación: creando tablas y datos de ejemplo...")
  runApi(["db:migrate"])
  runApi(["exec", "./src/scripts/seed.ts"])
  runApi(["user", "-e", "admin@catalogo.test", "-p", "supersecret"])
} else {
  runApi(["db:migrate"])
}

console.log(`
  Catálogo             http://localhost:3100/sneakerhub-co
  Panel del proveedor  http://localhost:7001  (admin+sneakerhub-co@test.com / Test1234!)
  Administración       http://localhost:7000  (admin@catalogo.test / supersecret)
  Sandbox de WhatsApp  http://localhost:3100/dev/whatsapp-outbox

  Con todo arriba, en otra terminal: npm run verify:e2e
`)

const apps = spawn(bin("turbo"), ["run", "dev", "--ui=stream"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, MERCUR_DISABLE_TELEMETRY: "true", TURBO_TELEMETRY_DISABLED: "1" },
})

const stop = () => {
  apps.kill()
  database?.kill("SIGTERM")
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
apps.on("exit", (code) => {
  database?.kill("SIGTERM")
  process.exit(code ?? 0)
})
