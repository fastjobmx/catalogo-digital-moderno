import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { enqueueCatalogImport } from "../../../../lib/queue"
import { CATALOGO_MODULE } from "../../../../modules/catalogo"
import type CatalogoModuleService from "../../../../modules/catalogo/service"

async function findOwnImport(req: AuthenticatedMedusaRequest) {
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const [job] = await catalogo.listCatalogImports({
    id: req.params.id,
    seller_id: (req as any).seller_context.seller_id,
  })
  if (!job) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Importación no encontrada")
  }
  return job
}

/** Progreso de la importación, consultado por el panel. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { rows: _rows, ...job } = await findOwnImport(req)
  res.json({ import: job })
}

/** Confirma la previsualización y encola el procesamiento. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const job = await findOwnImport(req)
  if (job.status !== "preview") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Esta importación ya fue confirmada")
  }
  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  await catalogo.updateCatalogImports({
    id: job.id,
    status: "queued",
    failed_count: 0,
  })
  await enqueueCatalogImport(req.scope, job.id)
  res.status(202).json({ import: { id: job.id, status: "queued" } })
}
