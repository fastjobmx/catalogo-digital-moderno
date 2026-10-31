import { validateRows } from "../../lib/import-rows"
import { buildProductRows, VENDORS } from "../seed-data"

describe("datos del seed", () => {
  const byVendor = VENDORS.map((vendor) => ({
    vendor,
    ...validateRows(buildProductRows(vendor)),
  }))
  const all = byVendor.flatMap(({ valid }) => valid)

  it("cumple los mínimos por proveedor", () => {
    expect(VENDORS).toHaveLength(4)
    for (const { vendor, valid, errors } of byVendor) {
      expect(errors).toEqual([])
      expect(valid.length).toBeGreaterThanOrEqual(30)
      expect(valid.length).toBeLessThanOrEqual(40)
      expect(valid.filter((row) => row.is_featured).length).toBeGreaterThanOrEqual(3)
      expect(new Set(valid.map((row) => row.title)).size).toBe(valid.length)
      valid.forEach((row) => {
        expect(row.price).toBeGreaterThanOrEqual(vendor.minPrice)
        expect(row.price).toBeLessThanOrEqual(vendor.maxPrice)
        expect(row.images.length).toBeGreaterThanOrEqual(2)
        expect(row.sizes.length).toBeGreaterThan(0)
        expect(row.brand).toBeTruthy()
      })
    }
  })

  it("cumple los mínimos globales", () => {
    expect(all.length).toBeGreaterThanOrEqual(120)
    expect(all.filter((row) => row.stock === 0).length).toBeGreaterThanOrEqual(10)
    expect(all.filter((row) => row.compare_at_price).length).toBeGreaterThanOrEqual(5)
    all.forEach((row) => {
      expect(row.price).toBeGreaterThanOrEqual(150000)
      expect(row.price).toBeLessThanOrEqual(650000)
      expect(row.stock).toBeLessThanOrEqual(25)
    })
  })

  it("es determinista", () => {
    expect(buildProductRows(VENDORS[0])).toEqual(buildProductRows(VENDORS[0]))
  })
})
