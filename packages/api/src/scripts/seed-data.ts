import type { RawImportRow } from "../lib/import-rows"

type Model = [brand: string, model: string, category: string]

export type VendorSeed = {
  name: string
  handle: string
  skuPrefix: string
  description: string
  whatsapp_phone: string
  primary_color: string
  secondary_color: string
  logoBackground: string
  address: { address_1: string; city: string; province: string; postal_code: string }
  first_name: string
  last_name: string
  payment_methods: { name: string; detail?: string }[]
  productCount: number
  minPrice: number
  maxPrice: number
  sizes: string
  colors: string[]
  models: Model[]
}

export const SELLER_PASSWORD = "Test1234!"

export const VENDORS: VendorSeed[] = [
  {
    name: "SneakerHub CO",
    handle: "sneakerhub-co",
    skuPrefix: "SNK",
    description:
      "Tenis deportivos y urbanos a precio de bodega. Despachamos a toda Colombia.",
    whatsapp_phone: "+573001112233",
    primary_color: "#111827",
    secondary_color: "#F59E0B",
    logoBackground: "111827",
    address: {
      address_1: "Calle 19 # 8-45, Local 12",
      city: "Bogotá",
      province: "Bogotá D.C.",
      postal_code: "110321",
    },
    first_name: "Laura",
    last_name: "Gómez",
    payment_methods: [
      { name: "Nequi", detail: "300 111 2233" },
      { name: "Daviplata", detail: "300 111 2233" },
      { name: "Transferencia Bancolombia", detail: "Ahorros 000-000000-00" },
    ],
    productCount: 36,
    minPrice: 150000,
    maxPrice: 320000,
    sizes: "38|39|40|41|42|43",
    colors: ["Blanco", "Negro", "Gris", "Azul", "Rojo", "Verde", "Beige", "Vino"],
    models: [
      ["Nike", "Air Force 1 '07", "Urbanos"],
      ["Adidas", "Samba OG", "Urbanos"],
      ["Puma", "Suede Classic", "Urbanos"],
      ["New Balance", "574 Core", "Urbanos"],
      ["Nike", "Revolution 7", "Deportivos"],
      ["Adidas", "Runfalcon 3", "Deportivos"],
      ["Reebok", "Classic Leather", "Urbanos"],
      ["Puma", "Velocity Nitro", "Deportivos"],
      ["Vans", "Old Skool", "Urbanos"],
    ],
  },
  {
    name: "UrbanKicks Medellín",
    handle: "urbankicks-medellin",
    skuPrefix: "URB",
    description:
      "Sneakers premium y ediciones limitadas seleccionadas una a una. Entregas el mismo día en Medellín.",
    whatsapp_phone: "+573004445566",
    primary_color: "#7C3AED",
    secondary_color: "#EC4899",
    logoBackground: "7C3AED",
    address: {
      address_1: "Carrera 43A # 7-50, Oficina 301",
      city: "Medellín",
      province: "Antioquia",
      postal_code: "050021",
    },
    first_name: "Andrés",
    last_name: "Ríos",
    payment_methods: [
      { name: "Transferencia", detail: "Bancolombia ahorros 111-111111-11" },
      { name: "Contraentrega en Medellín" },
    ],
    productCount: 32,
    minPrice: 380000,
    maxPrice: 650000,
    sizes: "39|40|41|42|43|44",
    colors: ["Chicago", "Panda", "Sail", "Bred", "Mocha", "University Blue", "Pine", "Sand"],
    models: [
      ["Jordan", "Air Jordan 1 Retro High", "Edición limitada"],
      ["Jordan", "Air Jordan 4 Retro", "Edición limitada"],
      ["Nike", "Dunk Low Premium", "Premium"],
      ["Nike", "Air Max 1 '86", "Premium"],
      ["New Balance", "990v6 Made in USA", "Premium"],
      ["New Balance", "2002R Protection Pack", "Edición limitada"],
      ["Adidas", "Forum 84 Low", "Premium"],
      ["Converse", "Chuck 70 Plus", "Premium"],
    ],
  },
  {
    name: "Deportes El Campeón",
    handle: "deportes-el-campeon",
    skuPrefix: "CAM",
    description:
      "Calzado deportivo infantil y juvenil para el colegio y la cancha. Más de 15 años vistiendo pequeños campeones.",
    whatsapp_phone: "+573007778899",
    primary_color: "#059669",
    secondary_color: "#FBBF24",
    logoBackground: "059669",
    address: {
      address_1: "Avenida 6N # 23-17",
      city: "Cali",
      province: "Valle del Cauca",
      postal_code: "760045",
    },
    first_name: "Carolina",
    last_name: "Mejía",
    payment_methods: [
      { name: "Nequi", detail: "300 777 8899" },
      { name: "Efecty", detail: "A nombre de Deportes El Campeón" },
    ],
    productCount: 34,
    minPrice: 150000,
    maxPrice: 260000,
    sizes: "28|29|30|31|32|33|34|35|36|37",
    colors: ["Negro", "Azul", "Rojo", "Blanco", "Verde", "Fucsia", "Naranja", "Gris"],
    models: [
      ["Nike", "Star Runner 4 GS", "Juvenil"],
      ["Adidas", "Tensaur Run 2.0 K", "Infantil"],
      ["Puma", "Anzarun Lite Jr", "Juvenil"],
      ["Reebok", "Rush Runner 5", "Infantil"],
      ["New Balance", "Fresh Foam 650 Kids", "Infantil"],
      ["Converse", "Chuck Taylor All Star Kids", "Infantil"],
      ["Vans", "Ward Youth", "Juvenil"],
      ["Jordan", "Stay Loyal 3 GS", "Juvenil"],
    ],
  },
  {
    name: "Sole Society Bogotá",
    handle: "sole-society-bogota",
    skuPrefix: "SOL",
    description:
      "Tenis casuales y de moda para el día a día en la ciudad. Curamos cada colección con asesoría personalizada.",
    whatsapp_phone: "+573001234567",
    primary_color: "#0EA5E9",
    secondary_color: "#1E293B",
    logoBackground: "0EA5E9",
    address: {
      address_1: "Carrera 13 # 85-32, Local 4",
      city: "Bogotá",
      province: "Bogotá D.C.",
      postal_code: "110221",
    },
    first_name: "Sofía",
    last_name: "Pardo",
    payment_methods: [
      { name: "Tarjeta (coordinado)" },
      { name: "Transferencia", detail: "Davivienda ahorros 222-222222-22" },
    ],
    productCount: 30,
    minPrice: 220000,
    maxPrice: 420000,
    sizes: "36|37|38|39|40|41|42",
    colors: ["Marfil", "Negro", "Crema", "Terracota", "Salvia", "Rosa Palo", "Azul Marino"],
    models: [
      ["Converse", "Chuck Taylor All Star Lift", "Moda"],
      ["Vans", "Authentic Stackform", "Moda"],
      ["Puma", "Palermo", "Casuales"],
      ["Adidas", "Gazelle Bold", "Moda"],
      ["New Balance", "327", "Casuales"],
      ["Reebok", "Club C 85", "Casuales"],
      ["Nike", "Court Vision Low", "Casuales"],
    ],
  },
]

export const CUSTOMERS = [
  { name: "Cliente Prueba 1", phone: "+573101112233", email: "cliente1@test.com" },
  { name: "Cliente Prueba 2", phone: "+573104445566", email: "cliente2@test.com" },
  { name: "Cliente Prueba 3", phone: "+573107778899", email: "cliente3@test.com" },
]

// Hash determinista: repetir el seed en cualquier máquina produce los mismos datos.
function hash(text: string): number {
  let value = 2166136261
  for (const char of text) {
    value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  }
  return (value >>> 0) / 4294967296
}

const roundPrice = (amount: number) => Math.floor(amount / 10000) * 10000 + 9900

export function buildProductRows(vendor: VendorSeed): RawImportRow[] {
  const { models, colors, skuPrefix } = vendor

  return Array.from({ length: vendor.productCount }, (_, index) => {
    const sku = `${skuPrefix}-${String(index + 1).padStart(4, "0")}`
    const [brand, model, category] = models[index % models.length]
    // Cada vuelta por los modelos usa otro color, así ningún nombre se repite.
    const round = Math.floor(index / models.length)
    const color = colors[(index % models.length + round) % colors.length]
    const title = `${brand} ${model} ${color}`

    const span = vendor.maxPrice - vendor.minPrice - 9900
    const price = roundPrice(vendor.minPrice + hash(`${sku}:price`) * span)
    const hasDiscount = index % 9 === 2
    const urls = Array.from(
      { length: 2 + (index % 2) },
      (_, image) => `https://picsum.photos/seed/${sku}-${image + 1}/600/600`
    )

    return {
      sku,
      title,
      description:
        `${title} de ${brand}, en la línea ${category.toLowerCase()} de ${vendor.name}. ` +
        `Materiales resistentes y plantilla cómoda para usar todo el día. ` +
        `Producto original con cambio de talla sin costo.`,
      price,
      // Índices 5, 16, 27: al menos 3 agotados por proveedor.
      stock: index % 11 === 5 ? 0 : 1 + Math.floor(hash(`${sku}:stock`) * 25),
      image_url: urls[0],
      images: urls.join("|"),
      category,
      brand,
      sizes: vendor.sizes,
      compare_at_price: hasDiscount ? roundPrice(price * 1.25) : null,
      is_featured: index % 10 === 0 ? "si" : "no",
    }
  })
}
