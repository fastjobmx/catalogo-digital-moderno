import { useEffect, useRef, useState } from "react"
import { Button, Container, Heading, Select, Table, Text, toast } from "@medusajs/ui"
import { ArrowUpTray } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { vendorFetch } from "../../lib/api"
import type { ParsedSheet } from "../../lib/import-parser.worker"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const NOT_MAPPED = "__none__"

const FIELDS = [
  { key: "sku", label: "SKU", required: true, aliases: ["sku", "ref", "referencia", "codigo"] },
  { key: "title", label: "Nombre", required: true, aliases: ["nombre", "name", "titulo", "producto"] },
  { key: "price", label: "Precio", required: true, aliases: ["precio", "price", "valor"], exclude: ["anterior", "antes", "compare"] },
  { key: "stock", label: "Stock", required: false, aliases: ["stock", "cantidad", "inventario", "existencias"] },
  { key: "description", label: "Descripción", required: false, aliases: ["descripcion", "description", "detalle"] },
  { key: "image_url", label: "Imagen URL", required: false, aliases: ["imagen", "image", "foto", "url"], exclude: ["imagenes", "images", "galeria"] },
  { key: "category", label: "Categoría", required: false, aliases: ["categoria", "category", "linea"] },
  { key: "sizes", label: "Tallas (38|39|40)", required: false, aliases: ["tallas", "talla", "sizes", "size"] },
  { key: "brand", label: "Marca", required: false, aliases: ["marca", "brand"] },
  { key: "compare_at_price", label: "Precio anterior", required: false, aliases: ["anterior", "antes", "compare"] },
  { key: "is_featured", label: "Destacado (sí/no)", required: false, aliases: ["destacado", "featured"] },
  { key: "images", label: "Más imágenes (url|url)", required: false, aliases: ["imagenes", "images", "galeria"] },
] as const

type FieldKey = (typeof FIELDS)[number]["key"]
type Mapping = Record<FieldKey, string>

type Preview = {
  id: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  to_create: number
  to_update: number
  sample: { sku: string; title: string; price: number; stock: number | null; category: string | null }[]
  errors: { row: number; sku?: string; message: string }[]
}

type Job = {
  status: "queued" | "processing" | "completed" | "failed" | "preview"
  total_rows: number
  processed_rows: number
  created_count: number
  updated_count: number
  failed_count: number
  errors: { items: { row: number; sku?: string; message: string }[] }
}

const plain = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase()

function guessMapping(headers: string[]): Mapping {
  const mapping = {} as Mapping
  for (const field of FIELDS) {
    const exclude: readonly string[] = "exclude" in field ? field.exclude : []
    const match = headers.find(
      (header) =>
        field.aliases.some((alias) => plain(header).includes(alias)) &&
        !exclude.some((word) => plain(header).includes(word))
    )
    mapping[field.key] = match ?? NOT_MAPPED
  }
  return mapping
}

function parseInWorker(file: File) {
  return new Promise<ParsedSheet>((resolve, reject) => {
    const worker = new Worker(
      new URL("../../lib/import-parser.worker.ts", import.meta.url),
      { type: "module" }
    )
    worker.onmessage = ({ data }) => {
      worker.terminate()
      data.ok ? resolve(data.sheet) : reject(new Error(data.message))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message))
    }
    worker.postMessage(file)
  })
}

export const config: RouteConfig = {
  label: "Importar catálogo",
  icon: ArrowUpTray,
}

const ImportPage = () => {
  const [fileName, setFileName] = useState("")
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!jobId) {
      return
    }
    const timer = setInterval(async () => {
      const { import: current } = await vendorFetch<{ import: Job }>(
        `/vendor/catalog-imports/${jobId}`
      )
      setJob(current)
      if (current.status === "completed" || current.status === "failed") {
        clearInterval(timer)
      }
    }, 1500)
    return () => clearInterval(timer)
  }, [jobId])

  const reset = () => {
    setSheet(null)
    setMapping(null)
    setPreview(null)
    setJobId(null)
    setJob(null)
    setFileName("")
    if (input.current) {
      input.current.value = ""
    }
  }

  const onFile = async (file?: File) => {
    if (!file) {
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("El archivo supera los 10 MB")
      return
    }
    setBusy(true)
    try {
      const parsed = await parseInWorker(file)
      if (!parsed.rows.length) {
        throw new Error("El archivo no tiene filas")
      }
      setFileName(file.name)
      setSheet(parsed)
      setMapping(guessMapping(parsed.headers))
    } catch (error) {
      toast.error(`No se pudo leer el archivo: ${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const buildPreview = async () => {
    if (!sheet || !mapping) {
      return
    }
    setBusy(true)
    try {
      const rows = sheet.rows.map((row) =>
        Object.fromEntries(
          FIELDS.filter((field) => mapping[field.key] !== NOT_MAPPED).map((field) => [
            field.key,
            row[mapping[field.key]],
          ])
        )
      )
      const { import: result } = await vendorFetch<{ import: Preview }>(
        "/vendor/catalog-imports",
        { method: "POST", body: JSON.stringify({ file_name: fileName, rows }) }
      )
      setPreview(result)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!preview) {
      return
    }
    setBusy(true)
    try {
      await vendorFetch(`/vendor/catalog-imports/${preview.id}`, { method: "POST" })
      setJobId(preview.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const missingRequired = FIELDS.some(
    (field) => field.required && mapping?.[field.key] === NOT_MAPPED
  )
  const percent = job?.total_rows
    ? Math.round((job.processed_rows / job.total_rows) * 100)
    : 0

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading>Importar catálogo</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Sube un CSV o Excel de hasta 10 MB. Si un SKU ya existe, se actualiza.
        </Text>
      </div>

      {!sheet && (
        <div className="px-6 py-6">
          <label
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              onFile(event.dataTransfer.files[0])
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? "border-ui-fg-interactive bg-ui-bg-subtle" : "border-ui-border-strong"
            }`}
          >
            <ArrowUpTray />
            <Text weight="plus">
              {busy ? "Leyendo archivo…" : "Arrastra tu archivo aquí o haz clic para elegirlo"}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              CSV, XLS o XLSX de hasta 10 MB
            </Text>
            <input
              ref={input}
              type="file"
              aria-label="Archivo CSV o Excel"
              accept=".csv,.xls,.xlsx"
              disabled={busy}
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {sheet && mapping && !preview && (
        <div className="space-y-4 px-6 py-6">
          <Text weight="plus">
            {fileName}: {sheet.rows.length} filas. Revisa qué columna corresponde a cada dato.
          </Text>
          <div className="grid gap-3 md:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <Text size="small" weight="plus" className="mb-1">
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                <Select
                  value={mapping[field.key]}
                  onValueChange={(value) =>
                    setMapping({ ...mapping, [field.key]: value })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={NOT_MAPPED}>No importar</Select.Item>
                    {sheet.headers.map((header) => (
                      <Select.Item key={header} value={header}>
                        {header}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button disabled={busy || missingRequired} onClick={buildPreview}>
              Validar y previsualizar
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cambiar archivo
            </Button>
          </div>
        </div>
      )}

      {preview && !jobId && (
        <div className="space-y-4 px-6 py-6">
          <Text weight="plus">
            {preview.valid_rows} filas válidas: {preview.to_create} nuevas y{" "}
            {preview.to_update} actualizaciones. {preview.invalid_rows} con errores.
          </Text>

          {preview.errors.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Fila</Table.HeaderCell>
                    <Table.HeaderCell>SKU</Table.HeaderCell>
                    <Table.HeaderCell>Error</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {preview.errors.map((error, index) => (
                    <Table.Row key={index}>
                      <Table.Cell>{error.row}</Table.Cell>
                      <Table.Cell>{error.sku ?? "-"}</Table.Cell>
                      <Table.Cell>{error.message}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}

          {preview.sample.length > 0 && (
            <div className="overflow-auto rounded-lg border">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>SKU</Table.HeaderCell>
                    <Table.HeaderCell>Nombre</Table.HeaderCell>
                    <Table.HeaderCell>Categoría</Table.HeaderCell>
                    <Table.HeaderCell>Precio</Table.HeaderCell>
                    <Table.HeaderCell>Stock</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {preview.sample.map((row) => (
                    <Table.Row key={row.sku}>
                      <Table.Cell>{row.sku}</Table.Cell>
                      <Table.Cell>{row.title}</Table.Cell>
                      <Table.Cell>{row.category ?? "-"}</Table.Cell>
                      <Table.Cell>{row.price.toLocaleString("es-CO")}</Table.Cell>
                      <Table.Cell>{row.stock ?? "-"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}

          <div className="flex gap-2">
            <Button disabled={busy || !preview.valid_rows} onClick={confirmImport}>
              Importar {preview.valid_rows} productos
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Volver al mapeo
            </Button>
          </div>
        </div>
      )}

      {jobId && (
        <div className="space-y-3 px-6 py-6">
          <Text weight="plus">
            {job?.status === "completed"
              ? "Importación terminada"
              : job?.status === "failed"
                ? "La importación falló"
                : "Importando en segundo plano. Puedes seguir trabajando."}
          </Text>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-ui-bg-subtle h-2 overflow-hidden rounded-full"
          >
            <div className="bg-ui-fg-interactive h-full" style={{ width: `${percent}%` }} />
          </div>
          {job && (
            <Text size="small">
              {job.processed_rows} de {job.total_rows}: {job.created_count} creados,{" "}
              {job.updated_count} actualizados, {job.failed_count} con error.
            </Text>
          )}
          {job?.errors.items.slice(0, 20).map((error, index) => (
            <Text key={index} size="small" className="text-ui-fg-error">
              {error.sku ?? `Fila ${error.row}`}: {error.message}
            </Text>
          ))}
          {(job?.status === "completed" || job?.status === "failed") && (
            <Button variant="secondary" onClick={reset}>
              Importar otro archivo
            </Button>
          )}
        </div>
      )}
    </Container>
  )
}

export default ImportPage
