// Catálogo en modo producción en el puerto 3200, para publicarlo con un túnel.
// Requiere el sistema arriba (npm run dev). Solo expone el catálogo, sin paneles ni sandbox.
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"

const storefront = path.resolve(import.meta.dirname, "../apps/storefront")
const next = path.resolve(
  import.meta.dirname,
  "../node_modules/.bin",
  process.platform === "win32" ? "next.exe" : "next"
)
const env = { ...process.env, NEXT_DIST_DIR: ".next-prod", NODE_ENV: "production" }

const build = spawnSync(next, ["build"], { cwd: storefront, env, stdio: "inherit" })
if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

console.log("\nCatálogo listo en http://localhost:3200")
console.log("En otra terminal: cloudflared tunnel --url http://localhost:3200\n")
spawn(next, ["start", "--port", "3200"], { cwd: storefront, env, stdio: "inherit" }).on(
  "exit",
  (code) => process.exit(code ?? 0)
)
