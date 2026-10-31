import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  createOffersWorkflow,
  createProductsWorkflow,
  upsertOfferPricesWorkflow,
} from "@mercurjs/core/workflows"
import { CATALOGO_MODULE } from "../modules/catalogo"
import type CatalogoModuleService from "../modules/catalogo/service"
import { invalidateCatalog } from "./catalog-read"
import { ensureSellerCatalogSetup } from "./seller-setup"
import type { ImportRow, RowError } from "./import-rows"

const BATCH_SIZE = 50

export async function findExistingOffers(
  container: MedusaContainer,
  sellerId: string,
  skus: string[]
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const existing = new Map<string, any>()
  for (let i = 0; i < skus.length; i += 500) {
    const { data } = await query.graph({
      entity: "offer",
      fields: [
        "id",
        "sku",
        "product_id",
        "product.metadata",
        "inventory_item_link.inventory_item_id",
      ],
      filters: { seller_id: sellerId, sku: skus.slice(i, i + 500) },
    })
    data.forEach((offer: any) => existing.set(offer.sku, offer))
  }
  return existing
}

export async function countExistingSkus(
  container: MedusaContainer,
  sellerId: string,
  skus: string[]
) {
  return (await findExistingOffers(container, sellerId, skus)).size
}

type Setup = Awaited<ReturnType<typeof ensureSellerCatalogSetup>>

// Una celda vacía no modifica el producto: un CSV de solo precios no borra lo demás.
function productFields(row: ImportRow, metadata?: Record<string, any> | null) {
  const urls = [
    ...new Set([...(row.image_url ? [row.image_url] : []), ...row.images]),
  ]
  return {
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    ...(urls.length
      ? { thumbnail: urls[0], images: urls.map((url) => ({ url })) }
      : {}),
    metadata: {
      category: row.category ?? metadata?.category ?? null,
      brand: row.brand ?? metadata?.brand ?? null,
      sizes: row.sizes.length ? row.sizes : (metadata?.sizes ?? []),
      compare_at_price: row.compare_at_price ?? metadata?.compare_at_price ?? null,
      is_featured: row.is_featured ?? metadata?.is_featured ?? false,
      ...row.extra,
    },
  }
}

async function createRows(
  container: MedusaContainer,
  sellerId: string,
  setup: Setup,
  rows: ImportRow[]
) {
  if (!rows.length) {
    return
  }
  // Variante y handle son únicos en todo el marketplace; el SKU solo por proveedor.
  const scope = sellerId.slice(-8).toLowerCase()
  const scopedSku = (row: ImportRow) => `${scope}-${row.sku}`
  const handleFor = (row: ImportRow) =>
    `${scope}-${row.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

  await createProductsWorkflow(container).run({
    input: {
      created_by: setup.memberId,
      products: rows.map((row) => ({
        ...productFields(row),
        handle: handleFor(row),
        status: ProductStatus.PUBLISHED,
        variants: [{ title: row.title, sku: scopedSku(row) }],
      })) as any,
    },
  })

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["handle", "variants.id"],
    filters: { handle: rows.map(handleFor) },
  })
  const variantByHandle = new Map(
    products.map((p: any) => [p.handle, p.variants[0].id])
  )

  await createOffersWorkflow(container).run({
    input: {
      offers: rows.map((row) => ({
        seller_id: sellerId,
        created_by: setup.memberId,
        sku: row.sku,
        variant_id: variantByHandle.get(handleFor(row)) as string,
        shipping_profile_id: setup.shippingProfileId,
        inventory_items: [
          {
            sku: scopedSku(row),
            stock_levels: [
              {
                location_id: setup.stockLocationId,
                stocked_quantity: row.stock ?? 0,
              },
            ],
          },
        ],
        prices: [{ amount: row.price, currency_code: setup.currencyCode }],
      })),
    },
  })
}

async function updateRow(
  container: MedusaContainer,
  setup: Setup,
  row: ImportRow,
  offer: any
) {
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        { id: offer.product_id, ...productFields(row, offer.product?.metadata) },
      ],
    } as any,
  })
  await upsertOfferPricesWorkflow(container).run({
    input: {
      offers: [
        {
          id: offer.id,
          prices: [{ amount: row.price, currency_code: setup.currencyCode }],
        },
      ],
    },
  })
  const inventoryItemId = offer.inventory_item_link?.[0]?.inventory_item_id
  if (inventoryItemId && row.stock !== null) {
    await container.resolve(Modules.INVENTORY).updateInventoryLevels([
      {
        inventory_item_id: inventoryItemId,
        location_id: setup.stockLocationId,
        stocked_quantity: row.stock,
      },
    ])
  }
}

/** Ejecuta la importación por lotes, cediendo el event loop entre lote y lote. */
export async function processCatalogImport(
  container: MedusaContainer,
  importId: string
) {
  const catalogo = container.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const job = await catalogo.retrieveCatalogImport(importId)
  // Un reintento de la cola no debe repetir un trabajo ya cerrado.
  if (job.status === "completed") {
    return
  }

  const rows = (job.rows as unknown as { items: ImportRow[] }).items
  const errors = [...(job.errors as unknown as { items: RowError[] }).items]
  await catalogo.updateCatalogImports({ id: importId, status: "processing" })

  try {
    const setup = await ensureSellerCatalogSetup(container, job.seller_id)
    let processed = 0
    let created = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const existing = await findExistingOffers(
        container,
        job.seller_id,
        batch.map((row) => row.sku)
      )
      const newRows = batch.filter((row) => !existing.has(row.sku))
      const fail = (row: ImportRow, error: unknown) => {
        failed += 1
        errors.push({
          row: 0,
          sku: row.sku,
          message: (error as Error).message.slice(0, 300),
        })
      }

      try {
        await createRows(container, job.seller_id, setup, newRows)
        created += newRows.length
      } catch {
        // El lote es atómico: se repite fila por fila para aislar la que falló.
        for (const row of newRows) {
          try {
            await createRows(container, job.seller_id, setup, [row])
            created += 1
          } catch (error) {
            fail(row, error)
          }
        }
      }

      for (const row of batch) {
        const offer = existing.get(row.sku)
        if (!offer) {
          continue
        }
        try {
          await updateRow(container, setup, row, offer)
          updated += 1
        } catch (error) {
          fail(row, error)
        }
      }

      processed += batch.length
      await catalogo.updateCatalogImports({
        id: importId,
        processed_rows: processed,
        created_count: created,
        updated_count: updated,
        failed_count: failed,
      })
      await new Promise((resolve) => setImmediate(resolve))
    }

    invalidateCatalog(job.seller_id)
    await catalogo.updateCatalogImports({
      id: importId,
      status: "completed",
      errors: { items: errors.slice(0, 500) },
      rows: { items: [] },
    })
  } catch (error) {
    await catalogo.updateCatalogImports({
      id: importId,
      status: "failed",
      errors: {
        items: [...errors, { row: 0, message: (error as Error).message }].slice(0, 500),
      },
    })
    throw error
  }
}
