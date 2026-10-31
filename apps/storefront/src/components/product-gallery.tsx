"use client"

import { useRef, useState, type MouseEvent } from "react"
import type { Product } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ProductImage } from "./product-image"

export function ProductGallery({ product, ratio }: { product: Product; ratio: string }) {
  const photos = product.images.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : []
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState<string | null>(null)
  const rail = useRef<HTMLDivElement>(null)
  const soldOut = product.stock <= 0

  const goTo = (index: number) => {
    setActive(index)
    rail.current?.scrollTo({ left: rail.current.clientWidth * index, behavior: "smooth" })
  }

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * 100
    const y = ((event.clientY - box.top) / box.height) * 100
    setZoom(`${x}% ${y}%`)
  }

  return (
    <div>
      {/* Riel con scroll-snap: en móvil el swipe es nativo y no requiere librerías. */}
      <div
        ref={rail}
        onScroll={(event) => {
          const box = event.currentTarget
          setActive(Math.round(box.scrollLeft / box.clientWidth))
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-card"
      >
        {photos.map((url, index) => (
          <div
            key={url}
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            className="w-full shrink-0 snap-center overflow-hidden"
          >
            <div
              style={zoom ? { transform: "scale(1.8)", transformOrigin: zoom } : undefined}
              className="transition-transform duration-200"
            >
              <ProductImage
                src={url}
                blur={product.blur[index]}
                alt={`${product.title}, foto ${index + 1}`}
                ratio={ratio}
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={index === 0}
                grayscale={soldOut}
              />
            </div>
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="mt-2 flex gap-2">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`Ver foto ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => goTo(index)}
              className={cn(
                "w-16 overflow-hidden rounded-lg ring-2 ring-offset-1 transition-all duration-200",
                index === active ? "ring-brand" : "ring-transparent"
              )}
            >
              <ProductImage src={url} alt="" ratio={ratio} sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
