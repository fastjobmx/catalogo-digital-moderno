"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const WIDTHS = [300, 600, 1200]

/** El pipeline genera -300, -600 y -1200; otras URLs (CSV) se usan tal cual. */
function srcSetFor(src: string) {
  return /-1200\.webp$/.test(src)
    ? WIDTHS.map((width) => `${src.replace("-1200.webp", `-${width}.webp`)} ${width}w`).join(", ")
    : undefined
}

type Props = {
  src?: string | null
  alt: string
  ratio: string
  blur?: string | null
  sizes: string
  priority?: boolean
  grayscale?: boolean
  className?: string
}

export function ProductImage({
  src,
  alt,
  ratio,
  blur,
  sizes,
  priority,
  grayscale,
  className,
}: Props) {
  const image = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (image.current?.complete) {
      setLoaded(true)
    }
  }, [])

  return (
    <div
      style={{
        // La proporción reserva el espacio y evita saltos de layout.
        aspectRatio: ratio.replace(":", " / "),
        backgroundImage: blur ? `url(${blur})` : undefined,
        backgroundSize: "cover",
      }}
      className={cn(
        "relative w-full overflow-hidden bg-photo",
        !loaded && !blur && "shimmer",
        className
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={image}
          src={src}
          srcSet={srcSetFor(src)}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
            grayscale && "grayscale"
          )}
        />
      )}
    </div>
  )
}
