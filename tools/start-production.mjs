// Arranque del backend en el hosting: migra, siembra si se pide e inicia el servidor compilado.
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"

const api = path.resolve(import.meta.dirname, "../packages/api")
const medusa = path.resolve(
  import.meta.dirname,
  "../node_modules/.bin",
  process.platform === "win32" ? "medusa.exe" : "medusa"
)

function run(args, { optional = false } = {}) {
  const result = spawnSync(medusa, args, { cwd: api, stdio: "inherit" })
  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1)
  }
}

run(["db:migrate"])

// RUN_SEED solo para la primera carga: el seed restablece la marca de los comercios de prueba.
if (process.env.RUN_SEED === "true") {
  run(["exec", "./src/scripts/seed.ts"])
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    // Falla sin consecuencias si el administrador ya existe.
    run(["user", "-e", process.env.ADMIN_EMAIL, "-p", process.env.ADMIN_PASSWORD], {
      optional: true,
    })
  }
}

spawn(medusa, ["start"], {
  cwd: path.join(api, ".medusa/server"),
  stdio: "inherit",
}).on("exit", (code) => process.exit(code ?? 0))
