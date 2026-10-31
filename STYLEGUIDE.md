# Guía de estilo

## Dos capas de tema

**Plataforma** ("Rendimiento y Energía"): panel y páginas generales.

| Token | Valor |
| --- | --- |
| Primario | `#0057FF` |
| Acento | `#C1FF00`, siempre con texto oscuro |
| Fondo | `#F8F9FA` |
| Tarjetas | `#FFFFFF` |
| Texto | `#212529` |
| Texto secundario | `#6C757D` |

El panel usa `@medusajs/ui`, así que la paleta se aplica sobre sus variables en `apps/vendor/src/theme.css`. Las pantallas propias del panel la heredan; las de Mercur también, en lo que usen esos tokens.

**Storefront**: `apps/storefront/src/app/[slug]/layout.tsx` inyecta en cada comercio:

```css
--brand-primary: /* color del proveedor */;
--brand-on-primary: /* blanco o #111827 */;
--brand-secondary: /* color del proveedor */;
--brand-on-secondary: /* blanco o #111827 */;
```

`readableOn(hex)` en `src/lib/utils.ts` elige el color de texto con mayor contraste, así un neón nunca lleva texto blanco. El panel avisa cuando el mejor contraste posible queda bajo 4.5:1.

Los tokens están en `apps/storefront/src/app/globals.css`, en `@theme inline`: Tailwind 4 no usa `tailwind.config`. Clases: `bg-brand`, `text-brand-foreground`, `bg-accent`, `text-accent-foreground`, `bg-canvas`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-photo`, `rounded-card`, `shadow-card`, `shadow-card-hover`.

## Tipografía

Manrope con `next/font`. Títulos 800, cuerpo 400, precios 700 con `tabular-nums`.

## Forma y movimiento

- Tarjetas: radio 16 px, sombra `0 4px 12px rgba(0,0,0,.05)`, en hover `0 8px 24px rgba(0,0,0,.08)`.
- Chips y botones pequeños: 999 px.
- Transiciones de 200 ms. `prefers-reduced-motion` las desactiva.
- Objetivos táctiles de al menos 44 px (`min-h-11`).
- Espaciado en la escala de Tailwind; margen lateral de 16 px en móvil.

## Fotos por rubro

| Proporción | Rubros |
| --- | --- |
| 1:1 | Tenis, belleza, accesorios, tecnología, mascotas |
| 4:5 | Moda, hogar |
| 4:3 | Repostería |

Se guarda en `vendor_profile.image_ratio`. Todas las tarjetas de un grid usan la misma. El fondo `#F3F4F6` hace convivir fotos de estudio y de ambiente.

## Componentes

```tsx
<ProductImage src={url} blur={blur} alt="" ratio="4:5" sizes="50vw" />
```
Reserva el espacio, arma `srcset` para las fotos `-1200.webp` y muestra el blur o el shimmer.

```tsx
<PriceTag price={129900} compareAt={159900} currencyCode="cop" large />
<Badge tone="danger">-20%</Badge>
<Chip active onClick={select}>Vestidos</Chip>
<Button variant="accent">Añadir al carrito</Button>
<VariantSelector options={options} soldOut={[]} value={choice} onChange={pick} />
<EmptyState kind="search" title="Sin resultados" description="Prueba otra palabra." />
```

| Componente | Uso |
| --- | --- |
| `ProductCard` | Tarjeta del grid, con estados Oferta, Nuevo y Agotado |
| `Header`, `Footer` | Marco de cada comercio |
| `StoreProfile` | Portada tipo Instagram |
| `BentoGrid` | Inicio del comercio, con un producto distinto por bloque |
| `FilterPanel`, `FilterSheet` | Barra lateral en desktop y hoja inferior en móvil |
| `CartDrawer` | Carrito y envío del pedido |
| `Skeleton` | Estado de carga |
| `KpiCard`, tabla de `mis-productos` | Panel del proveedor |
