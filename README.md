# Catálogo Digital

Catálogo multi-proveedor con marca blanca y pedidos por WhatsApp, construido sobre [Mercur](https://github.com/mercurjs/mercur). Las decisiones técnicas están en [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick start para probar el sistema completo

Solo necesitas Node.js 22 o superior. Postgres viene embebido: Docker es opcional.

```bash
git clone https://github.com/fastjobmx/catalogo-digital-moderno.git
```

```bash
cd catalogo-digital-moderno
```

```bash
cp .env.example packages/api/.env
```

Opcional: añade `PEXELS_API_KEY` a `packages/api/.env`. Sin key, las fotos salen de Wikimedia Commons, con calidad más desigual.

```bash
npx bun install
```

```bash
npm run seed:images
```

```bash
npm run dev
```

La primera vez, `npm run dev` levanta Postgres, crea las tablas y carga 8 comercios, 178 productos y 3 clientes. Si ya estaba instalado, usa `npm run db:migrate` y `npm run db:seed` con la base arriba.

En otra terminal, una sola vez `npm run verify:setup` (descarga Chromium) y luego:

```bash
npm run verify:e2e
```

Deja las capturas en `screenshots/index.html`. `npm install` no funciona con esta plantilla de Mercur: usa `npx bun install`.

| App | URL |
| --- | --- |
| Catálogos | http://localhost:3100/sneakerhub-co (y los slugs de abajo) |
| Panel del proveedor | http://localhost:7001 |
| Administración | http://localhost:7000 |
| Sandbox de WhatsApp | http://localhost:3100/dev/whatsapp-outbox |
| API | http://localhost:9000 |

## Fotos del seed

`npm run seed:images` busca en Pexels, Unsplash, Pixabay y Wikimedia Commons, en ese orden. Genera WebP de 1200, 600 y 300 px más un blur, y guarda `apps/storefront/public/seed-images/manifest.json`. Está cacheado: `--force` regenera y `--vendor=slug` limita a un comercio.

`npm run db:seed` no usa la red: lee el manifest. Si no existe, usa placeholders locales. Después de cambiar fotos, corre `npm run db:seed` para actualizar los productos y `npm run seed:credits` para regenerar `CREDITS.md`.

Las fotos no se versionan. Cada persona las genera con `seed:images`.

## Datos de prueba

`npm run db:seed` se puede repetir: solo crea o actualiza lo que cambió. Usuarios: `admin+[slug]@test.com` / `Test1234!`. Son solo para desarrollo.

| Comercio | Slug | Rubro | WhatsApp |
| --- | --- | --- | --- |
| SneakerHub CO | `sneakerhub-co` | Tenis | +573001112233 |
| Bella Moda Femenina | `bella-moda` | Ropa de mujer | +573000000012 |
| Glow Beauty Store | `glow-beauty` | Belleza | +573000000013 |
| Brillo Accesorios | `brillo-accesorios` | Bisutería y relojes | +573000000014 |
| Dulce Tentación Repostería | `dulce-tentacion` | Repostería | +573000000015 |
| TecnoCell Accesorios | `tecnocell` | Accesorios de celular | +573000000016 |
| Casa Bonita Deco | `casa-bonita` | Hogar | +573000000017 |
| Patitas Felices | `patitas-felices` | Mascotas | +573000000018 |

Administración: `admin@catalogo.test` / `supersecret`. Clientes: `cliente1@test.com`, `cliente2@test.com` y `cliente3@test.com`.

`npm run verify:e2e` deja en SneakerHub CO hasta 8 productos `E2E-` y un pedido nuevo por corrida. Devuelve el color original al terminar.

## WhatsApp

Por defecto `WHATSAPP_PROVIDER=mock`: nada sale a internet. Cada mensaje queda en la tabla `whatsapp_outbox`, en el log como `[WA-MOCK]` y en la página del sandbox, que no existe en producción. Enviar a `+573000000000` simula un fallo.

Para enviar de verdad, cambia las variables en `packages/api/.env` y reinicia (el arranque no toma las de la terminal). Sigue [docs/whatsapp-plantillas.md](docs/whatsapp-plantillas.md).

## Columnas del CSV o Excel

Obligatorias: SKU, nombre y precio. Opcionales: stock, descripción, imagen URL, más imágenes y tallas separadas con `|`, categoría, marca, precio anterior y destacado (sí/no). Si un SKU ya existe se actualiza, y las celdas vacías no cambian nada.

## Pruebas

```bash
npm test
```

## Producción

```bash
bun run build
```

Revisa antes la sección "Pendiente para producción" de [ARCHITECTURE.md](ARCHITECTURE.md).
