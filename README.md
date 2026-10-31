# Catálogo Digital

Catálogo multi-proveedor con marca blanca y pedidos por WhatsApp, construido sobre [Mercur](https://github.com/mercurjs/mercur). Las decisiones técnicas están en [ARCHITECTURE.md](ARCHITECTURE.md).

## Arrancar

Solo necesitas Node.js 22 o superior. No hace falta instalar Postgres, Redis ni tokens de WhatsApp.

```bash
npx bun install
```

```bash
npm run dev
```

La primera vez tarda un par de minutos: crea el `.env`, levanta Postgres, las tablas y los datos de prueba. Luego también puedes usar `iniciar.cmd` con doble clic.

Con todo arriba, en otra terminal, comprueba el flujo completo:

```bash
npm run verify:e2e
```

| App | URL |
| --- | --- |
| Catálogos | http://localhost:3100/sneakerhub-co, `/urbankicks-medellin`, `/deportes-el-campeon`, `/sole-society-bogota` |
| Panel del proveedor | http://localhost:7001 |
| Administración | http://localhost:7000 |
| Sandbox de WhatsApp | http://localhost:3100/dev/whatsapp-outbox |
| API | http://localhost:9000 |

## Datos de prueba

`npm run seed` se puede repetir: solo crea lo que falte y no duplica nada. Son solo para desarrollo.

| Proveedor | Usuario | Contraseña | WhatsApp |
| --- | --- | --- | --- |
| SneakerHub CO | `admin+sneakerhub-co@test.com` | `Test1234!` | +573001112233 |
| UrbanKicks Medellín | `admin+urbankicks-medellin@test.com` | `Test1234!` | +573004445566 |
| Deportes El Campeón | `admin+deportes-el-campeon@test.com` | `Test1234!` | +573007778899 |
| Sole Society Bogotá | `admin+sole-society-bogota@test.com` | `Test1234!` | +573001234567 |

Administración: `admin@catalogo.test` / `supersecret`.

Son 132 productos, 12 de ellos agotados, más 3 clientes: `cliente1@test.com`, `cliente2@test.com` y `cliente3@test.com`.

`npm run verify:e2e` deja en SneakerHub CO hasta 7 productos `E2E-` y un pedido nuevo por corrida. Devuelve el color original al terminar.

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
