import type { Vendor } from "@/lib/api"

export function Footer({ vendor }: { vendor: Vendor }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 pb-24 text-sm text-muted md:pb-6">
        <p className="font-bold text-ink">{vendor.name}</p>
        {vendor.rubro && <p>{vendor.rubro}</p>}
        {vendor.business_hours && <p>{vendor.business_hours}</p>}
        {vendor.instagram && <p>{vendor.instagram}</p>}
      </div>
    </footer>
  )
}
