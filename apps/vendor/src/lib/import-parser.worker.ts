import { read, utils } from "xlsx"

export type ParsedSheet = {
  headers: string[]
  rows: Record<string, string | number | null>[]
}

// Excel en español guarda CSV en Windows-1252; los demás programas, en UTF-8.
function decodeCsv(bytes: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder("windows-1252").decode(bytes)
  }
}

// Corre en un Web Worker: leer un Excel de 10 MB no congela la pestaña.
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const bytes = await event.data.arrayBuffer()
    const workbook = /\.csv$/i.test(event.data.name)
      ? read(decodeCsv(bytes), { type: "string", dense: true })
      : read(bytes, { dense: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = utils.sheet_to_json<ParsedSheet["rows"][number]>(sheet, {
      defval: null,
      raw: false,
    })
    const headers = rows.length ? Object.keys(rows[0]) : []
    self.postMessage({ ok: true, sheet: { headers, rows } })
  } catch (error) {
    self.postMessage({ ok: false, message: (error as Error).message })
  }
}
