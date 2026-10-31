import { ProductGridSkeleton } from "@/components/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <ProductGridSkeleton />
    </main>
  )
}
