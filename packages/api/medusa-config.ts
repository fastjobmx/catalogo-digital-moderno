import { loadEnv } from '@medusajs/framework/utils'
import { withMercur } from '@mercurjs/core'
import fs from 'fs'
import path from 'path'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Resolves where a dashboard app lives:
// - in the source tree (development): ../../apps/<name>
// - in the production build artifact: hosts that deploy only `.medusa/server` (for example
//   Medusa Cloud) get the panels bundled into ./dashboards/<name> by
//   scripts/bundle-dashboards.mjs during `build`. The compiled config runs from the
//   artifact root, so __dirname points there.
const dashboardAppDir = (name: string) => {
  const bundled = path.join(__dirname, 'dashboards', name)
  return fs.existsSync(bundled) ? bundled : path.join(__dirname, `../../apps/${name}`)
}

const REDIS_URL = process.env.REDIS_URL

// Sin REDIS_URL, Medusa usa sus módulos en memoria: válido para una sola instancia.
const redisModules = REDIS_URL
  ? [
      { resolve: '@medusajs/medusa/cache-redis', options: { redisUrl: REDIS_URL } },
      { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: REDIS_URL } },
      { resolve: '@medusajs/medusa/workflow-engine-redis', options: { redis: { url: REDIS_URL } } },
      {
        resolve: '@medusajs/medusa/locking',
        options: {
          providers: [
            {
              resolve: '@medusajs/medusa/locking-redis',
              id: 'locking-redis',
              is_default: true,
              options: { redisUrl: REDIS_URL },
            },
          ],
        },
      },
    ]
  : []

const fileProvider = process.env.S3_BUCKET
  ? {
      resolve: '@medusajs/medusa/file-s3',
      id: 's3',
      options: {
        file_url: process.env.S3_FILE_URL,
        access_key_id: process.env.S3_ACCESS_KEY_ID,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
      },
    }
  : {
      resolve: '@medusajs/medusa/file-local',
      id: 'local',
      options: {
        // The local provider bakes this into every uploaded file URL.
        // It must be the publicly reachable origin in production, or
        // images resolve to localhost and render broken.
        backend_url: process.env.FILE_BACKEND_URL || 'http://localhost:9000/static',
      },
    }

module.exports = withMercur({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  featureFlags: {
    seller_registration: true
  },
  modules: [
    {
      resolve: './src/modules/catalogo',
    },
    {
      resolve: '@mercurjs/core/modules/admin-ui',
      options: {
        appDir: dashboardAppDir('admin'),
        path: '/dashboard',
      }
    },
    {
      resolve: '@mercurjs/core/modules/vendor-ui',
      options: {
        appDir: dashboardAppDir('vendor'),
        path: '/seller',
      }
    },
    ...redisModules,
    {
      resolve: '@medusajs/medusa/file',
      options: { providers: [fileProvider] },
    },
  ],
})
