import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { updateSellersWorkflow } from "@mercurjs/core/workflows"
import { normalizePhone } from "../../../lib/phone"
import { getOrCreateProfile } from "../../../lib/seller-setup"
import { parseOrThrow, z } from "../../../lib/validation"
import { CATALOGO_MODULE } from "../../../modules/catalogo"
import type CatalogoModuleService from "../../../modules/catalogo/service"

// Rutas propias del storefront que un proveedor no puede ocupar como slug.
const RESERVED_SLUGS = new Set(["api", "admin", "seller", "dashboard", "dev", "_next", "static"])

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones")
    .min(3)
    .max(60),
  logo: z.string().url().nullable(),
  primary_color: hexColor,
  secondary_color: hexColor,
  whatsapp_phone: z.string().trim().min(7).max(24),
  payment_methods: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        detail: z.string().trim().max(120).optional(),
      })
    )
    .max(10),
})

async function loadBrand(req: AuthenticatedMedusaRequest) {
  const sellerId = (req as any).seller_context.seller_id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: ["id", "name", "handle", "logo", "status"],
    filters: { id: sellerId },
  })
  const profile = await getOrCreateProfile(req.scope, sellerId)
  return {
    name: seller.name,
    slug: seller.handle,
    logo: seller.logo,
    status: seller.status,
    primary_color: profile.primary_color,
    secondary_color: profile.secondary_color,
    whatsapp_phone: profile.whatsapp_phone,
    payment_methods: (profile.payment_methods as any)?.items ?? [],
  }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ brand: await loadBrand(req) })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = parseOrThrow(bodySchema, req.body)
  const sellerId = (req as any).seller_context.seller_id as string

  if (RESERVED_SLUGS.has(body.slug)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Ese slug está reservado")
  }
  const whatsappPhone = normalizePhone(body.whatsapp_phone)
  if (!whatsappPhone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "WhatsApp inválido")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: taken } = await query.graph({
    entity: "seller",
    fields: ["id"],
    filters: { handle: body.slug },
  })
  if (taken.some((seller: any) => seller.id !== sellerId)) {
    throw new MedusaError(MedusaError.Types.CONFLICT, "Ese slug ya está en uso")
  }

  await updateSellersWorkflow(req.scope).run({
    input: {
      selector: { id: sellerId },
      update: { name: body.name, handle: body.slug, logo: body.logo },
    },
  })

  const catalogo = req.scope.resolve<CatalogoModuleService>(CATALOGO_MODULE)
  const profile = await getOrCreateProfile(req.scope, sellerId)
  await catalogo.updateVendorProfiles({
    id: profile.id,
    primary_color: body.primary_color,
    secondary_color: body.secondary_color,
    whatsapp_phone: whatsappPhone,
    payment_methods: { items: body.payment_methods },
  })

  res.json({ brand: await loadBrand(req) })
}
