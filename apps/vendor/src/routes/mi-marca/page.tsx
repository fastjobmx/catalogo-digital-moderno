import { useEffect, useState } from "react"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { vendorFetch } from "../../lib/api"

type PaymentMethod = { name: string; detail?: string }

type Brand = {
  name: string
  slug: string
  logo: string | null
  primary_color: string
  secondary_color: string
  whatsapp_phone: string | null
  payment_methods: PaymentMethod[]
}

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3100"

export const config: RouteConfig = {
  label: "Mi marca",
  icon: Sparkles,
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

  const uploadLogo = async (file?: File) => {
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
      patch({ logo: files[0].url })
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
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
          <div>
            <Label htmlFor="primary">Color primario</Label>
            <input
              id="primary"
              type="color"
              className="block h-10 w-full rounded"
              value={brand.primary_color}
              onChange={(e) => patch({ primary_color: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="secondary">Color secundario</Label>
            <input
              id="secondary"
              type="color"
              className="block h-10 w-full rounded"
              value={brand.secondary_color}
              onChange={(e) => patch({ secondary_color: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="logo">Logo</Label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm"
              onChange={(e) => uploadLogo(e.target.files?.[0])}
            />
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

      <Container className="h-fit p-0">
        <div
          className="flex items-center gap-3 rounded-t-lg p-4"
          style={{ background: brand.primary_color, color: "#fff" }}
        >
          {brand.logo ? (
            <img src={brand.logo} alt="" className="size-10 rounded-lg bg-white object-contain" />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-lg font-bold"
              style={{ background: brand.secondary_color }}
            >
              {brand.name.charAt(0)}
            </span>
          )}
          <span className="font-semibold">{brand.name}</span>
        </div>
        <div className="p-4">
          <Text size="small" className="text-ui-fg-subtle">
            Vista previa del encabezado
          </Text>
        </div>
      </Container>
    </div>
  )
}

export default BrandPage
