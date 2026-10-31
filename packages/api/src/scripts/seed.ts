import { createHash } from "crypto"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  approveSellerWorkflow,
  createSellerAccountWorkflow,
  updateSellersWorkflow,
} from "@mercurjs/core/workflows"
import { findExistingOffers, processCatalogImport } from "../lib/catalog-import"
import { validateRows } from "../lib/import-rows"
import { normalizePhone } from "../lib/phone"
import { getOrCreateProfile } from "../lib/seller-setup"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type CatalogoModuleService from "../modules/catalogo/service"
import {
  bannerFor,
  buildProductRows,
  CUSTOMERS,
  loadManifest,
  SELLER_PASSWORD,
  VendorSeed,
  VENDORS,
  writeLogo,
} from "./seed-data"

type Container = ExecArgs["container"]

async function ensureMarketplaceBase(container: Container) {
  const logger = container.resolve("logger")
  const storeModule = container.resolve(Modules.STORE)
  const salesChannels = container.resolve(Modules.SALES_CHANNEL)
  const regions = container.resolve(Modules.REGION)
  const apiKeys = container.resolve(Modules.API_KEY)

  const [store] = await storeModule.listStores()
  let [channel] = await salesChannels.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!channel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    })
    channel = result[0]
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Catálogo Digital",
        default_sales_channel_id: channel.id,
        supported_currencies: [{ currency_code: "cop", is_default: true }],
      } as any,
    },
  })

  const [region] = await regions.listRegions({ name: "Colombia" })
  if (!region) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Colombia",
            currency_code: "cop",
            countries: ["co"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
  }

  let [key] = await apiKeys.listApiKeys({ title: "Storefront", type: "publishable" })
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }],
      },
    })
    key = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [channel.id] },
    })
  }

  // La clave cambia con cada base de datos; el storefront la lee de aquí.
  const storefrontDir = path.resolve(process.cwd(), "../../apps/storefront")
  mkdirSync(storefrontDir, { recursive: true })
  writeFileSync(
    path.join(storefrontDir, ".env.local"),
    `MEDUSA_BACKEND_URL=http://localhost:9000\nMEDUSA_PUBLISHABLE_KEY=${key.token}\n`
  )
  // Es la clave pública del storefront; en el hosting se copia desde este log.
  logger.info(`Clave publicable: ${key.token}`)
}

async function ensureSeller(
  container: Container,
  vendor: VendorSeed,
  banner: string | null
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const auth = container.resolve(Modules.AUTH)
  const logo = writeLogo(vendor)

  const {
    data: [existing],
  } = await query.graph({
    entity: "seller",
    fields: ["id"],
    filters: { handle: vendor.slug },
  })
  if (existing) {
    await updateSellersWorkflow(container).run({
      input: {
        selector: { id: existing.id },
        update: { description: vendor.description, logo, banner },
      },
    })
    return existing.id as string
  }

  const memberEmail = `admin+${vendor.slug}@test.com`
  const { success, authIdentity } = await auth.register("emailpass", {
    body: { email: memberEmail, password: SELLER_PASSWORD },
  })
  let authIdentityId = authIdentity?.id
  if (!success) {
    // Quedó de una corrida interrumpida entre el registro y la creación del proveedor.
    const [identity] = await auth.listProviderIdentities({
      entity_id: memberEmail,
      provider: "emailpass",
    })
    authIdentityId = identity.auth_identity_id as string
  }

  const { result: seller } = await createSellerAccountWorkflow(container).run({
    input: {
      auth_identity_id: authIdentityId,
      member_email: memberEmail,
      first_name: vendor.owner[0],
      last_name: vendor.owner[1],
      seller: {
        name: vendor.name,
        handle: vendor.slug,
        email: `contacto@${vendor.slug}.test`,
        phone: vendor.whatsapp,
        currency_code: "cop",
        description: vendor.description,
        logo,
        banner,
      },
      address: {
        address_1: vendor.address,
        city: vendor.city,
        province: vendor.province,
        postal_code: vendor.postal,
        country_code: "co",
        phone: vendor.whatsapp,
      },
    } as any,
  })
  await approveSellerWorkflow(container).run({ input: { seller_id: seller.id } })
  return seller.id
}

type Manifest = ReturnType<typeof loadManifest>

async function seedVendor(container: Container, vendor: VendorSeed, manifest: Manifest) {
  const logger = container.resolve("logger")
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)

  const banner = bannerFor(vendor, manifest)
  const sellerId = await ensureSeller(container, vendor, banner.url)
  const profile = await getOrCreateProfile(container, sellerId)
  await catalogo.updateVendorProfiles({
    id: profile.id,
    primary_color: vendor.primary,
    secondary_color: vendor.secondary,
    whatsapp_phone: normalizePhone(vendor.whatsapp),
    payment_methods: { items: vendor.payments },
    rubro: vendor.rubro,
    city: vendor.city,
    instagram: vendor.instagram,
    business_hours: vendor.hours,
    delivery_time: vendor.delivery,
    image_ratio: vendor.ratio,
    banner_blur: banner.blur,
  })

  // El seed pasa por el mismo camino que un CSV real.
  const rows = buildProductRows(vendor, manifest)
  const { valid, errors } = validateRows(rows.map((row) => row.raw))
  if (errors.length) {
    throw new Error(`Seed inválido: ${JSON.stringify(errors)}`)
  }
  const prepared = valid.map((row, index) => {
    const extra = rows[index].extra
    return {
      ...row,
      extra: { ...extra, seed_hash: createHash("md5").update(JSON.stringify([row, extra])).digest("hex") },
    }
  })

  // Upsert: solo se escribe lo que falta o cambió, por ejemplo tras correr seed:images.
  const existing = await findExistingOffers(
    container,
    sellerId,
    prepared.map((row) => row.sku)
  )
  const pending = prepared.filter(
    (row) =>
      existing.get(row.sku)?.product?.metadata?.seed_hash !== row.extra.seed_hash
  )
  if (!pending.length) {
    logger.info(`${vendor.name}: ${prepared.length} productos al día.`)
    return
  }

  const job = await catalogo.createCatalogImports({
    seller_id: sellerId,
    file_name: "seed.csv",
    status: "queued",
    total_rows: pending.length,
    rows: { items: pending },
  } as any)
  await processCatalogImport(container, job.id)

  const result = await catalogo.retrieveCatalogImport(job.id)
  if (result.failed_count) {
    throw new Error(`${vendor.name}: ${JSON.stringify(result.errors)}`)
  }
  logger.info(
    `${vendor.name}: ${result.created_count} creados, ${result.updated_count} actualizados.`
  )
}

async function seedCustomers(container: Container) {
  const customers = container.resolve(Modules.CUSTOMER)
  const existing = await customers.listCustomers({
    email: CUSTOMERS.map((customer) => customer.email),
  })
  const known = new Set(existing.map((customer) => customer.email))

  for (const { name, phone, email } of CUSTOMERS) {
    if (!known.has(email)) {
      const [first_name, ...last] = name.split(" ")
      await customers.createCustomers({
        first_name,
        last_name: last.join(" "),
        email,
        phone,
      })
    }
  }
}

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve("logger")

  const manifest = loadManifest()
  if (!manifest) {
    logger.warn(
      "No hay seed-images/manifest.json: se usan placeholders locales. Ejecuta npm run seed:images para fotos reales."
    )
  }

  await ensureMarketplaceBase(container)
  for (const vendor of VENDORS) {
    await seedVendor(container, vendor, manifest)
  }
  await seedCustomers(container)

  logger.info("Seed terminado.")
}
