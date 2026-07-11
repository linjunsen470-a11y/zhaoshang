import { buildConfig, type SharpDependency } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Projects } from './collections/Projects'
import { Leads } from './collections/Leads'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

// For Docker / VPS deployment we will use Postgres
// Local dev can use env var or fallback

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const secret = process.env.PAYLOAD_SECRET
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL ERROR: PAYLOAD_SECRET environment variable is missing. It is required in production mode!')
}

export default buildConfig({
  admin: {
    user: 'users',
    meta: {
      title: '校园商铺房源管理',
      description: '快速整理、修改和上架校园商铺房源',
    },
    components: {
      beforeNavLinks: ['@/app/admin/components/PrimaryNav'],
      views: {
        dashboard: {
          // Team ops landing: todos, funnel, quality gates, share kit
          Component: '@/app/admin/components/OpsWorkbenchRoute',
        },
        inquiryInbox: {
          // Server route wrappers supply DefaultTemplate (nav / account chrome).
          Component: '@/app/admin/components/InquiryInboxRoute',
          path: '/workspace/inquiries',
        },
        equipmentWorkspace: {
          Component: '@/app/admin/components/EquipmentWorkspaceRoute',
          path: '/workspace/equipment',
        },
        systemSettings: {
          Component: '@/app/admin/components/SystemSettingsRoute',
          path: '/workspace/system',
        },
      },
    },
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, 'app/admin/[[...segments]]/importMap.js'),
    },
  },
  routes: {
    api: '/api/payload',
  },
  collections: [
    Projects,
    Leads,
    Media,
    Users,
  ],
  editor: lexicalEditor({}),
  secret: secret || 'your-fallback-dev-secret-for-local-demo',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    push: process.env.PAYLOAD_DB_PUSH === 'true',
    pool: {
      connectionString: process.env.DATABASE_URI || 'postgres://payload:payload@localhost:5432/payload',
    },
  }),
  sharp: sharp as unknown as SharpDependency,
  plugins: [
    // add plugins later e.g. for cloud storage
  ],
})
