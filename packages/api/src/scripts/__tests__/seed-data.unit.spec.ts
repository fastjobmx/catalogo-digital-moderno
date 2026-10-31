import { validateRows } from "../../lib/import-rows"
import { buildProductRows, VENDORS } from "../seed-data"

describe("datos del seed", () => {
  const byVendor = VENDORS.map((vendor) => {
    const rows = buildProductRows(vendor, [])
    return { vendor, rows, ...validateRows(rows.map((row) => row.raw)) }
  })
  const all = byVendor.flatMap(({ valid }) => valid)
  const extras = byVendor.flatMap(({ rows }) => rows.map((row) => row.extra))

  it("cumple los mínimos por proveedor", () => {
    expect(VENDORS).toHaveLength(8)
    for (const { vendor, valid, errors } of byVendor) {
      expect(errors).toEqual([])
      expect(valid.length).toBeGreaterThanOrEqual(20)
      expect(valid.length).toBeLessThanOrEqual(25)
      expect(valid.filter((row) => row.is_featured).length).toBeGreaterThanOrEqual(3)
      expect(new Set(valid.map((row) => row.title)).size).toBe(valid.length)
      expect(vendor.prefix).toHaveLength(3)
      valid.forEach((row) => {
        expect(row.brand).toBeTruthy()
        expect(row.stock).toBeLessThanOrEqual(25)
      })
    }
  })

  it("cumple las reglas especiales", () => {
    expect(all.length).toBeGreaterThanOrEqual(160)
    expect(all.filter((row) => row.stock === 0).length).toBeGreaterThanOrEqual(12)
    expect(all.filter((row) => row.compare_at_price).length).toBeGreaterThanOrEqual(10)
    expect(extras.filter((extra) => extra.is_new).length).toBeGreaterThanOrEqual(5)
  })

  it("usa ciudades distintas y conserva el WhatsApp de SneakerHub", () => {
    expect(new Set(VENDORS.map((vendor) => vendor.city)).size).toBe(8)
    expect(VENDORS[0].whatsapp).toBe("+573001112233")
    expect(new Set(VENDORS.map((vendor) => vendor.whatsapp)).size).toBe(8)
  })

  it("define variantes en todos los productos", () => {
    extras.forEach((extra) => expect((extra.options as unknown[]).length).toBeGreaterThan(0))
  })
})
