"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type CartLine = {
  offer_id: string
  title: string
  image_url: string | null
  price: number
  stock: number
  size: string | null
  quantity: number
}

type CartValue = {
  lines: CartLine[]
  count: number
  total: number
  add: (line: Omit<CartLine, "quantity">, quantity: number) => void
  setQuantity: (offerId: string, size: string | null, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)

export function useCart() {
  const value = useContext(CartContext)
  if (!value) {
    throw new Error("useCart requiere CartProvider")
  }
  return value
}

const sameLine = (line: CartLine, offerId: string, size: string | null) =>
  line.offer_id === offerId && line.size === size

// Un carrito por proveedor: pedir a dos proveedores son dos pedidos distintos.
export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const storageKey = `cart:${slug}`
  const [lines, setLines] = useState<CartLine[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setLines(JSON.parse(saved))
      }
    } catch {
      // Sin almacenamiento el carrito funciona igual durante la visita.
    }
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) {
      return
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines))
    } catch {
      // Ver arriba.
    }
  }, [lines, loaded, storageKey])

  const add = useCallback<CartValue["add"]>((line, quantity) => {
    setLines((current) => {
      const existing = current.find((l) => sameLine(l, line.offer_id, line.size))
      if (!existing) {
        return [...current, { ...line, quantity: Math.min(quantity, line.stock) }]
      }
      return current.map((l) =>
        l === existing
          ? { ...l, quantity: Math.min(l.quantity + quantity, line.stock) }
          : l
      )
    })
  }, [])

  const setQuantity = useCallback<CartValue["setQuantity"]>((offerId, size, quantity) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => !sameLine(l, offerId, size))
        : current.map((l) =>
            sameLine(l, offerId, size)
              ? { ...l, quantity: Math.min(quantity, l.stock) }
              : l
          )
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
      add,
      setQuantity,
      clear,
    }),
    [lines, add, setQuantity, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
