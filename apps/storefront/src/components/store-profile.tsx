import { BadgeCheck, Clock, MapPin, Truck } from "lucide-react"
import type { Vendor } from "@/lib/api"

export function StoreProfile({ vendor }: { vendor: Vendor }) {
  return (
    <section aria-label={`Perfil de ${vendor.name}`}>
      <div
        className="relative h-24 overflow-hidden bg-brand bg-cover bg-center md:h-52"
        style={{
          backgroundImage: vendor.banner_blur ? `url(${vendor.banner_blur})` : undefined,
        }}
      >
        {vendor.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.banner}
            srcSet={vendor.banner.replace(/-1200\.webp$/, "-600.webp") + " 600w, " + vendor.banner + " 1200w"}
            sizes="100vw"
            alt=""
            className="size-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 35%, transparent) 70%)",
          }}
        />
      </div>

      <div className="bg-brand text-brand-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-5">
          <div className="flex items-end gap-3">
            {vendor.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.logo}
                alt={`Logo de ${vendor.name}`}
                className="relative z-10 -mt-9 size-20 shrink-0 rounded-full bg-surface object-cover ring-4 ring-surface"
              />
            )}
            <div className="min-w-0 pb-1">
              <h1 className="flex items-center gap-1 text-xl leading-tight md:text-2xl">
                <span className="truncate">{vendor.name}</span>
                <BadgeCheck className="size-5 shrink-0" aria-label="Comercio verificado" />
              </h1>
              {vendor.instagram && (
                <p className="truncate text-sm opacity-90">{vendor.instagram}</p>
              )}
            </div>
          </div>

          {vendor.description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-snug">{vendor.description}</p>
          )}

          <ul className="mt-3 space-y-1 text-sm">
            {vendor.city && (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {vendor.city}
              </li>
            )}
            {vendor.business_hours && (
              <li className="flex items-center gap-1.5">
                <Clock className="size-4 shrink-0" aria-hidden />
                {vendor.business_hours}
              </li>
            )}
            {vendor.delivery_time && (
              <li className="flex items-center gap-1.5">
                <Truck className="size-4 shrink-0" aria-hidden />
                {vendor.delivery_time}
              </li>
            )}
          </ul>

          {vendor.payment_methods.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Medios de pago">
              {vendor.payment_methods.map((method) => (
                <li
                  key={method.name}
                  className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-ink"
                >
                  {method.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
