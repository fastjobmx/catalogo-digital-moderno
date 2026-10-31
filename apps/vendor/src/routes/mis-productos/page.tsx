import { useEffect, useState } from "react"
import { Container, Heading, IconButton, Input, Table, Text, toast } from "@medusajs/ui"
import { ArrowUpRightOnBox, ShoppingBag } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Link } from "react-router-dom"
import { vendorFetch } from "../../lib/api"
import { money } from "../../lib/format"

type Product = {
  product_id: string
  sku: string
  title: string
  image_url: string | null
  price: number
  stock: number
  category: string | null
}

function StockDot({ stock }: { stock: number }) {
  const color = stock <= 0 ? "#B42318" : stock <= 5 ? "#D97706" : "#15803D"
  const label = stock <= 0 ? "Agotado" : stock <= 5 ? "Bajo" : "Disponible"
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums" title={label}>
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {stock}
      <span className="sr-only">{label}</span>
    </span>
  )
}

export const config: RouteConfig = {
  label: "Mis productos",
  icon: ShoppingBag,
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [code, setCode] = useState("cop")
  const [term, setTerm] = useState("")

  useEffect(() => {
    vendorFetch<{ products: Product[]; currency_code: string }>("/vendor/catalog-products")
      .then((data) => {
        setProducts(data.products)
        setCode(data.currency_code)
      })
      .catch((error) => toast.error(error.message))
  }, [])

  const visible = (products ?? []).filter((product) =>
    `${product.title} ${product.sku}`.toLowerCase().includes(term.toLowerCase())
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading>Mis productos</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {products?.length ?? 0} referencias en tu catálogo
          </Text>
        </div>
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar productos"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>
      </div>

      {products && visible.length === 0 && (
        <Text className="text-ui-fg-subtle px-6 py-10 text-center">
          No hay productos que coincidan.
        </Text>
      )}

      {visible.length > 0 && (
        <Table className="cards-on-mobile">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Foto</Table.HeaderCell>
              <Table.HeaderCell>Producto</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Precio</Table.HeaderCell>
              <Table.HeaderCell>Stock</Table.HeaderCell>
              <Table.HeaderCell>
                <span className="sr-only">Acciones</span>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visible.map((product, index) => (
              <Table.Row
                key={product.sku}
                className={index % 2 ? "bg-ui-bg-subtle" : undefined}
              >
                <Table.Cell>
                  <img
                    src={product.image_url?.replace("-1200.webp", "-300.webp")}
                    alt=""
                    className="my-1 size-12 rounded-lg bg-ui-bg-subtle object-cover"
                  />
                </Table.Cell>
                <Table.Cell className="max-w-64 truncate font-medium">
                  {product.title}
                </Table.Cell>
                <Table.Cell className="text-ui-fg-subtle">{product.sku}</Table.Cell>
                <Table.Cell className="tabular-nums">{money(product.price, code)}</Table.Cell>
                <Table.Cell>
                  <StockDot stock={product.stock} />
                </Table.Cell>
                <Table.Cell>
                  <Link
                    to={`/products/${product.product_id}`}
                    aria-label={`Editar ${product.title}`}
                  >
                    <IconButton variant="transparent" tabIndex={-1} aria-hidden>
                      <ArrowUpRightOnBox />
                    </IconButton>
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export default ProductsPage
