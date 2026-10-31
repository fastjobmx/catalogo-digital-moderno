# Arquitectura

Catálogo digital multi-proveedor: cada proveedor publica un catálogo de marca blanca, el cliente pide desde el celular y el pedido se coordina por WhatsApp.

## Estructura del monorepo

```
apps/
  storefront/           Next.js: catálogo público en /[slug], carrito y pedido
    src/app/[slug]/     Página del catálogo y server action del pedido
    src/components/     Carrito, tarjeta de producto, filtros y ui/ (estilo shadcn)
    src/lib/api.ts      Cliente del backend (solo servidor)
  vendor/               Panel del proveedor (Mercur)
    src/routes/         mi-marca, importar, pedidos-whatsapp
    src/lib/            Cliente y Web Worker que lee CSV/Excel
  admin/                Panel de administración (Mercur)
    src/routes/         catalogo-global
packages/
  api/                  Backend Medusa + Mercur
    src/modules/catalogo/  Modelos, servicio y migraciones propios
    src/api/            Endpoints store, vendor, admin y webhooks
    src/lib/            Importación, pedidos, cola y proveedores de WhatsApp
    src/jobs/           Arranque de workers y rescate de mensajes
    src/scripts/seed.ts 2 proveedores y 40 productos
tools/dev.mjs           Arranque de un comando (dev-db.mjs: Postgres embebido)
tools/verify-e2e.mjs    Verificación de punta a punta
fixtures/               CSV de la verificación
docs/                   Plantillas de WhatsApp y CSV de ejemplo
seed/catalog.json       Comercios y productos de prueba
```

## Flujo de un pedido

```
Celular -> Server Action de Next -> POST /store/catalogs/:slug/orders
                                     1. Recalcula precios y valida stock y tallas
                                     2. Guarda el pedido: pendiente_confirmacion
                                     3. Guarda 2 whatsapp_message: proveedor y cliente
                                     4. Encola en pg-boss y responde 202
Worker pg-boss -> proveedor de WhatsApp -> Meta/Twilio
Meta -> POST /webhooks/whatsapp -> actualiza entregado, leído o fallido
```

## Esquema de base de datos

Las tablas propias viven en el módulo `catalogo`. Los equivalentes de `vendors` y `products` ya existen en Mercur y se reutilizan.

| Concepto pedido | Tabla | Campos clave |
| --- | --- | --- |
| vendors | `seller` (Mercur) + `vendor_profile` | `handle` es el slug; `name`, `logo`, `status`. El perfil suma `primary_color`, `secondary_color`, `whatsapp_phone`, `payment_methods`, `stock_location_id` |
| products | `product`, `product_variant`, `offer` (Medusa y Mercur) | `offer.seller_id` + `offer.sku` son únicos. Precio e inventario cuelgan de la oferta. `product.metadata` guarda `category`, `brand`, `sizes`, `compare_at_price` e `is_featured` |
| orders | `order_request` | `display_id` (el #X del mensaje), `seller_id`, `status`, datos del cliente, `currency_code`, `total`, `idempotency_key` |
| order_items | `order_request_item` | `order_id`, `offer_id`, `sku`, `title`, `size`, `quantity`, `unit_price`, `line_total` |
| Sandbox | `whatsapp_outbox` | `message_id`, `to`, `template`, `payload`, `status`, `error`, `created_at` |
| Mensajes | `whatsapp_message` | `order_id`, `recipient`, `to_phone`, `template`, `params`, `body`, `status`, `provider_message_id`, `attempts`, `last_error` |
| Importaciones | `catalog_import` | `status`, `rows`, contadores y `errors` |

Estados del pedido: `pendiente_confirmacion`, `confirmado`, `entregado`, `cancelado`.

## Endpoints

| Método y ruta | Uso | Acceso |
| --- | --- | --- |
| `POST /vendor/sellers` | Crear proveedor (Mercur; un admin lo aprueba) | Registro |
| `GET, POST /vendor/brand` | Leer y guardar marca, slug, WhatsApp y pagos | Proveedor |
| `POST /vendor/catalog-imports` | Validar filas y crear la previsualización | Proveedor |
| `GET /vendor/catalog-imports/:id` | Progreso | Proveedor |
| `POST /vendor/catalog-imports/:id` | Confirmar y encolar | Proveedor |
| `GET /vendor/order-requests` | Bandeja, con filtro por estado | Proveedor |
| `GET, POST /vendor/order-requests/:id` | Detalle y cambio de estado | Proveedor |
| `POST /vendor/order-requests/:id/messages/:messageId/resend` | Reenviar WhatsApp | Proveedor |
| `GET /store/catalogs/:slug` | Catálogo con `q`, `category`, `offset`, `limit` | Clave publicable |
| `POST /store/catalogs/:slug/orders` | Crear pedido | Clave publicable |
| `GET, POST /webhooks/whatsapp` | Verificación y estados de Meta | Firma HMAC |
| `POST /webhooks/twilio` | Estados de Twilio | Firma HMAC |
| `GET /dev/whatsapp-outbox` | Mensajes del sandbox | Solo fuera de producción |
| `POST /dev/whatsapp-outbox/:id/retry` | Reencolar un mensaje | Solo fuera de producción |
| `GET /admin/catalog-overview` | Proveedores, pedidos y comisiones | Admin |
| `POST /admin/whatsapp-messages/:id/resend` | Reenviar WhatsApp | Admin |

Todos los cuerpos y parámetros se validan con Zod (`src/lib/validation.ts`). Los endpoints usan REST porque es la convención de Medusa y Mercur.

## Decisiones

### Mercur como base
Aporta proveedores, autenticación, roles, aprobación y paneles. Se extiende sin tocar su código: módulo propio, rutas propias y páginas en `src/routes`. Por eso no se agregó Better Auth ni Clerk: duplicaría la autenticación de Mercur. A cambio, cada producto necesita oferta, bodega y perfil de envío; `seller-setup.ts` los crea en la primera importación para que el proveedor no los vea.

### Pedido propio en vez de Order de Medusa
La Order de Medusa exige carrito, pago y envío. Aquí no hay pago en línea, así que `order_request` es una solicitud ligera. Si más adelante se agrega pasarela, confirmar una solicitud puede generar una Order real.

### Modelo de producto simple
Cada fila del CSV es un producto con una variante. Las tallas son una lista dentro de `metadata`, no variantes: el proveedor reporta un solo stock por referencia, y así un CSV de una fila por referencia alcanza. La talla elegida viaja en el pedido. Si se necesita stock por talla, habrá que migrar a variantes.

### pg-boss en vez de BullMQ
BullMQ exige Redis y este entorno no lo tiene; Windows tampoco tiene binario oficial. pg-boss guarda los trabajos en el mismo Postgres, con reintentos y backoff, sin infraestructura extra. Toda la cola está en `src/lib/queue.ts`, así que cambiar a BullMQ afecta un solo archivo.

Los workers viven en el proceso del backend. Medusa no entrega su contenedor al arrancar, por eso el job `whatsapp-queue` los inicia en su primer minuto (o antes, con el primer pedido). Con mucho volumen conviene separarlos con el modo worker de Medusa.

### Entrega confiable de WhatsApp
- El mensaje se guarda antes de enviarse, así que un fallo nunca pierde el pedido.
- 6 intentos con backoff exponencial para errores transitorios. Los definitivos, como un número inválido, no se reintentan y quedan como `failed`, listos para reenvío manual.
- Si un mensaje ya tiene `provider_message_id`, no se reenvía: un reintento no duplica.
- Cada minuto se rescatan los mensajes que no alcanzaron a encolarse.

### Datos y fotos del seed
`seed/catalog.json` es la fuente única: lo leen `seed-images` y `db:seed`. Separar ambos pasos permite sembrar sin internet. El seed compara un hash por producto, así que repetirlo solo escribe lo que cambió.

Wikimedia Commons es una fuente agregada: no pide key y da licencia y autor por foto. Es el último recurso antes del placeholder porque su relevancia es desigual, aun filtrando por el título del archivo.

Las URLs de las fotos se guardan absolutas (`SEED_ASSET_BASE_URL`) porque el importador exige URLs válidas. Para desplegar, las fotos deben subirse a un storage y sembrarse con esa base.

### Variantes
Los ejes viven en `product.metadata.options`, sin crear variantes de Medusa, por la misma razón que las tallas: hay un solo stock por referencia. `order_request_item.size` guarda la combinación elegida, como `M / Negro`, y `assertValidVariant` la valida en el servidor.

### Sandbox de WhatsApp
`getWhatsAppProvider` elige la implementación con `WHATSAPP_PROVIDER`: `mock`, `cloud` o `twilio`. `whatsapp_message` sigue siendo la cola y el estado de entrega con cualquier proveedor; `whatsapp_outbox` es solo el registro del mock.

Con `cloud` sin `WA_TOKEN` o `WA_PHONE_ID`, en desarrollo se usa el mock con una advertencia. En producción el envío falla a la vista: simularlo dejaría pedidos sin avisar y sin ningún error.

`/dev/*` no tiene autenticación y muestra teléfonos de clientes, por eso responde 404 cuando `NODE_ENV=production`, tanto en el backend como en el storefront.

### Plantillas, no texto libre
Meta solo permite texto libre dentro de las 24 h siguientes a un mensaje del usuario. Estos mensajes los inicia el negocio, así que deben ser plantillas aprobadas (`docs/whatsapp-plantillas.md`). Las variables de plantilla no admiten saltos de línea: por eso la lista de productos se une con ` | `.

### Importación que no bloquea
1. El navegador lee el archivo en un Web Worker, hasta 10 MB.
2. El proveedor mapea columnas; el servidor valida todas las filas y guarda un borrador sin tocar el catálogo.
3. Al confirmar, un trabajo procesa lotes de 50 cediendo el event loop entre lotes.

Si un lote falla, se repite fila por fila para aislar el error. El SKU es la llave: si ya existe, se actualiza. Las celdas vacías no modifican nada, así que un CSV de solo precios no borra imágenes ni categorías. Medido: 500 filas en 6,4 s, con `/health` por debajo de 50 ms.

### Lectura del catálogo
El catálogo se arma con `query.graph` y queda 60 s en memoria por proceso, hasta 5.000 productos por proveedor. Búsqueda y filtros corren sobre esa lista. Es simple y suficiente para el MVP, pero la caché no es compartida: con varias instancias, un cambio puede tardar hasta 60 s en verse. Al crecer conviene Redis o el módulo de búsqueda.

### Seguridad
- El navegador solo envía qué productos quiere; precios y total salen del servidor.
- La clave publicable y las llamadas al backend quedan en el servidor de Next.
- `idempotency_key` evita pedidos dobles por doble toque o reintento de red.
- Máximo 5 pedidos por teléfono cada hora (`ORDER_RATE_LIMIT_PER_HOUR`; `.env.example` lo sube para repetir las pruebas, en producción quita esa línea): cada pedido dispara un WhatsApp, y sin límite el formulario serviría para acosar a un tercero o inflar la factura de Meta.
- El webhook rechaza cualquier llamada sin firma HMAC válida.
- Las rutas de proveedor filtran siempre por el `seller_id` de la sesión.

### Stock
Pedir valida el stock pero no lo toca: un pedido sin confirmar puede no pagarse nunca. Se descuenta cuando el proveedor pasa el pedido a `confirmado` y vuelve al inventario si cancela uno ya confirmado. Si dos clientes pidieron la última unidad, el segundo no se puede confirmar y el panel lo explica. Sigue siendo un stock por referencia, no por talla.

### Versiones
Next.js 16 en lugar de 14: Mercur ya lo usa y 14 quedó sin soporte. `xlsx` se instala desde el CDN oficial de SheetJS, porque la versión de npm está desactualizada y tiene vulnerabilidades conocidas. Bun usa `linker = hoisted` porque los paneles de Mercur esperan dependencias planas.

## Para producción
- `REDIS_URL` activa caché, eventos y locks en Redis; es necesario con más de una instancia. Sin él, Medusa usa memoria.
- `S3_BUCKET` y sus variables cambian los logos de disco local a S3. Sin configurarlo, los archivos se pierden si el servidor no tiene disco persistente.
- Quita `ORDER_RATE_LIMIT_PER_HOUR` del `.env`, para volver al límite de 5.
- Activa `WHATSAPP_PROVIDER=cloud` o `twilio`, aprueba las plantillas y registra el webhook (`docs/whatsapp-plantillas.md`).
- Las rutas de storefront nuevas son aditivas: `GET /store/catalogs/:slug/products/:sku`, `GET /vendor/dashboard` y `GET /vendor/catalog-products`.
- Cambia `JWT_SECRET`, `COOKIE_SECRET` y las contraseñas de prueba.
- Comisiones: la vista global aplica un porcentaje fijo sobre todos los pedidos no cancelados. Es un informe, no una liquidación.
- Las pantallas propias están en español; el resto de los paneles de Mercur viene en inglés porque Mercur solo trae ese idioma en esta plantilla.
