import { useEffect, useState } from "react"
import { Button, Container, Heading, Input, Label, Select, Text, toast } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { HexColorPicker } from "react-colorful"
import { vendorFetch } from "../../lib/api"
import { contrastRatio, readableOn } from "../../lib/format"

type PaymentMethod = { name: string; detail?: string }

type Brand = {
  name: string
  slug: string
  logo: string | null
  banner: string | null
  image_ratio: string
  primary_color: string
  secondary_color: string
  whatsapp_phone: string | null
  payment_methods: PaymentMethod[]
}

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3100"
const AA = 4.5

export const config: RouteConfig = {
  label: "Mi marca",
  icon: Sparkles,
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const ratio = contrastRatio(value, readableOn(value))
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 [&_.react-colorful]:h-32 [&_.react-colorful]:w-full">
        <HexColorPicker color={value} onChange={onChange} />
      </div>
      <Input
        aria-label={`${label} en hexadecimal`}
        className="mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {ratio < AA && (
        <Text size="small" className="text-ui-fg-error mt-1">
          Contraste {ratio.toFixed(1)}:1. No cumple AA (mínimo {AA}:1).
        </Text>
      )}
    </div>
  )
}

function PhonePreview({ brand }: { brand: Brand }) {
  const onPrimary = readableOn(brand.primary_color)
  const onSecondary = readableOn(brand.secondary_color)
  const aspectRatio = brand.image_ratio.replace(":", " / ")
  return (
    <div className="mx-auto w-[260px] rounded-[32px] bg-[#111827] p-2">
      <div className="overflow-hidden rounded-[26px] bg-[#F8F9FA]">
        <div
          className="h-20 bg-cover bg-center"
          style={{
            backgroundColor: brand.primary_color,
            backgroundImage: brand.banner ? `url(${brand.banner})` : undefined,
          }}
        />
        <div className="px-3 pb-3" style={{ background: brand.primary_color, color: onPrimary }}>
          {brand.logo ? (
            <img
              src={brand.logo}
              alt=""
              className="-mt-6 size-12 rounded-full bg-white object-cover ring-2 ring-white"
            />
          ) : (
            <div className="-mt-6 size-12 rounded-full bg-white" />
          )}
          <p className="mt-1 truncate text-sm font-extrabold">{brand.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-2">
          {[0, 1].map((item) => (
            <div key={item} className="overflow-hidden rounded-xl bg-white">
              <div className="bg-[#E9ECEF]" style={{ aspectRatio }} />
              <div className="p-2">
                <div className="h-2 w-3/4 rounded bg-[#E9ECEF]" />
                <div
                  className="mt-2 rounded-full py-1 text-center text-[10px] font-bold"
                  style={{ background: brand.primary_color, color: onPrimary }}
                >
                  Añadir
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 pt-0">
          <div
            className="rounded-xl py-2 text-center text-xs font-bold"
            style={{ background: brand.secondary_color, color: onSecondary }}
          >
            Añadir al carrito
          </div>
        </div>
      </div>
    </div>
  )
}

const BrandPage = () => {
  const [brand, setBrand] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    vendorFetch<{ brand: Brand }>("/vendor/brand")
      .then(({ brand }) => setBrand(brand))
      .catch((error) => toast.error(error.message))
  }, [])

  if (!brand) {
    return <Container className="p-6">Cargando…</Container>
  }

  const patch = (changes: Partial<Brand>) => setBrand({ ...brand, ...changes })

  const setMethod = (index: number, changes: Partial<PaymentMethod>) =>
    patch({
      payment_methods: brand.payment_methods.map((method, i) =>
        i === index ? { ...method, ...changes } : method
      ),
    })

  const upload = async (field: "logo" | "banner", file?: File) => {
    if (!file) {
      return
    }
    const form = new FormData()
    form.append("files", file)
    try {
      const { files } = await vendorFetch<{ files: { url: string }[] }>(
        "/vendor/uploads",
        { method: "POST", body: form }
      )
      patch({ [field]: files[0].url })
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { brand: saved } = await vendorFetch<{ brand: Brand }>("/vendor/brand", {
        method: "POST",
        body: JSON.stringify({
          name: brand.name,
          slug: brand.slug,
          logo: brand.logo,
          banner: brand.banner,
          image_ratio: brand.image_ratio,
          primary_color: brand.primary_color,
          secondary_color: brand.secondary_color,
          whatsapp_phone: brand.whatsapp_phone ?? "",
          payment_methods: brand.payment_methods.filter((m) => m.name.trim()),
        }),
      })
      setBrand(saved)
      toast.success("Marca actualizada")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading>Mi marca</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Así verán tus clientes el catálogo: {STOREFRONT_URL}/{brand.slug}
          </Text>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Nombre comercial</Label>
            <Input
              id="name"
              value={brand.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="slug">Dirección del catálogo (slug)</Label>
            <Input
              id="slug"
              value={brand.slug}
              onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
            />
          </div>
          <ColorField
            label="Color primario"
            value={brand.primary_color}
            onChange={(primary_color) => patch({ primary_color })}
          />
          <ColorField
            label="Color secundario"
            value={brand.secondary_color}
            onChange={(secondary_color) => patch({ secondary_color })}
          />
          <div>
            <Label htmlFor="logo">Logo</Label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm"
              onChange={(e) => upload("logo", e.target.files?.[0])}
            />
          </div>
          <div>
            <Label htmlFor="banner">Banner</Label>
            <input
              id="banner"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm"
              onChange={(e) => upload("banner", e.target.files?.[0])}
            />
          </div>
          <div>
            <Label>Proporción de las fotos</Label>
            <Select
              value={brand.image_ratio}
              onValueChange={(image_ratio) => patch({ image_ratio })}
            >
              <Select.Trigger aria-label="Proporción de las fotos">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="1:1">Cuadrada 1:1</Select.Item>
                <Select.Item value="4:5">Vertical 4:5</Select.Item>
                <Select.Item value="4:3">Horizontal 4:3</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp que recibe los pedidos</Label>
            <Input
              id="whatsapp"
              value={brand.whatsapp_phone ?? ""}
              placeholder="300 123 4567"
              onChange={(e) => patch({ whatsapp_phone: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3 px-6 py-6">
          <Text weight="plus">Medios de pago</Text>
          {brand.payment_methods.map((method, index) => (
            <div key={index} className="flex gap-2">
              <Input
                aria-label="Medio de pago"
                placeholder="Nequi"
                value={method.name}
                onChange={(e) => setMethod(index, { name: e.target.value })}
              />
              <Input
                aria-label="Detalle del medio de pago"
                placeholder="300 123 4567"
                value={method.detail ?? ""}
                onChange={(e) => setMethod(index, { detail: e.target.value })}
              />
              <Button
                variant="secondary"
                onClick={() =>
                  patch({
                    payment_methods: brand.payment_methods.filter((_, i) => i !== index),
                  })
                }
              >
                Quitar
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              patch({ payment_methods: [...brand.payment_methods, { name: "" }] })
            }
          >
            Agregar medio de pago
          </Button>
        </div>

        <div className="flex justify-end px-6 py-4">
          <Button isLoading={saving} onClick={save}>
            Guardar
          </Button>
        </div>
      </Container>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Text size="small" weight="plus" className="mb-2 text-center">
          Vista previa en vivo
        </Text>
        <PhonePreview brand={brand} />
      </div>
    </div>
  )
}

export default BrandPage
