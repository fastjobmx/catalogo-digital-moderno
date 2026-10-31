import { parsePrice, validateRows } from "../import-rows"
import { normalizePhone } from "../phone"
import { buildCustomerMessage, buildVendorMessage } from "../whatsapp/messages"

describe("parsePrice", () => {
  it.each([
    ["$ 189.900", 189900],
    ["189,900", 189900],
    ["1.250.000", 1250000],
    ["189900", 189900],
    ["189900,50", 189900.5],
    [99900, 99900],
  ])("interpreta %s", (input, expected) => {
    expect(parsePrice(input)).toBe(expected)
  })

  it("el texto no produce un precio positivo", () => {
    expect(parsePrice("abc")).toBe(0)
  })
})

describe("validateRows", () => {
  const base = { sku: "A1", title: "Tenis", price: "$ 100.000", stock: "5" }

  it("acepta una fila válida y separa tallas", () => {
    const { valid, errors } = validateRows([{ ...base, sizes: "38|39, 40" }])
    expect(errors).toEqual([])
    expect(valid[0]).toMatchObject({ price: 100000, stock: 5, sizes: ["38", "39", "40"] })
  })

  it("deja stock en null si viene vacío, para no borrar el existente", () => {
    expect(validateRows([{ ...base, stock: "" }]).valid[0].stock).toBeNull()
  })

  it("reporta el número de fila del archivo", () => {
    const { errors } = validateRows([base, { ...base, sku: "A2", price: "x" }])
    expect(errors[0]).toMatchObject({ row: 3, sku: "A2" })
  })

  it("rechaza precio negativo sin afectar las demás filas", () => {
    const { valid, errors } = validateRows([base, { ...base, sku: "A2", price: "-50000" }])
    expect(valid).toHaveLength(1)
    expect(errors[0]).toMatchObject({ row: 3, sku: "A2", message: "Precio inválido" })
  })

  it("exige que el precio anterior sea mayor", () => {
    const { errors } = validateRows([{ ...base, compare_at_price: "90.000" }])
    expect(errors[0].message).toContain("precio anterior")
  })

  it("lee galería, marca y destacado", () => {
    const { valid } = validateRows([
      {
        ...base,
        images: "https://a.test/1.jpg|https://a.test/2.jpg",
        brand: "Nike",
        is_featured: "sí",
      },
    ])
    expect(valid[0]).toMatchObject({
      images: ["https://a.test/1.jpg", "https://a.test/2.jpg"],
      brand: "Nike",
      is_featured: true,
    })
  })

  it("rechaza SKU repetidos", () => {
    const { valid, errors } = validateRows([base, base])
    expect(valid).toHaveLength(1)
    expect(errors[0].message).toContain("repetido")
  })
})

describe("normalizePhone", () => {
  it.each([
    ["300 123 4567", "573001234567"],
    ["+57 300-123-4567", "573001234567"],
    ["573001234567", "573001234567"],
    ["+1 415 555 2671", "14155552671"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it("rechaza números cortos", () => {
    expect(normalizePhone("12345678")).toBeNull()
  })
})

describe("mensajes de WhatsApp", () => {
  const order = {
    display_id: 7,
    customer_name: "Ana\nPérez",
    customer_phone: "573001234567",
    customer_address: null,
    notes: "Llamar   antes",
    currency_code: "cop",
    total: 379800,
    items: [{ title: "Runner", sku: "T1", size: "40", quantity: 2 }],
  }

  it("arma variables sin saltos de línea, como exige Meta", () => {
    const { params, template } = buildVendorMessage(order)
    expect(template).toBe("pedido_proveedor")
    expect(params).toHaveLength(6)
    params.forEach((param) => expect(param).not.toMatch(/[\n\t]| {2,}/))
    expect(params[1]).toBe("2x Runner talla 40 (T1)")
  })

  it("incluye total y medios de pago para el cliente", () => {
    const { params, body } = buildCustomerMessage(order, "Tenis Bogotá", [
      { name: "Nequi", detail: "300" },
      { name: "Efectivo" },
    ])
    expect(params[2]).toBe("Nequi: 300, Efectivo")
    expect(body).toContain("Tu pedido #7")
    expect(body).toContain("Tenis Bogotá se contactará contigo")
  })

  it("nunca envía una variable vacía", () => {
    const { params } = buildCustomerMessage(order, "   ", [])
    expect(params[3]).toBe("-")
  })
})
