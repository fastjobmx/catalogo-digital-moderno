// Postgres local sin instalar nada: útil en máquinas sin Docker. Se detiene con Ctrl+C.
import { existsSync } from "node:fs"
import path from "node:path"
import EmbeddedPostgres from "embedded-postgres"

const databaseDir = path.resolve(import.meta.dirname, "../.data/postgres")
const firstRun = !existsSync(databaseDir)

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
})

if (firstRun) {
  await pg.initialise()
}
await pg.start()
if (firstRun) {
  await pg.createDatabase("catalogo")
}
console.log("Postgres listo en postgres://postgres:postgres@localhost:54329/catalogo")

const stop = async () => {
  await pg.stop()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
