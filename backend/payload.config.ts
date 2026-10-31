import { buildConfig, type SharpDependency } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { zh } from '@payloadcms/translations/languages/zh'
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
  i18n: { fallbackLanguage: 'zh', supportedLanguages: { zh } },
  admin: {
    user: 'users',
    meta: {
      title: '锦奕招商工作台',
      description: '房源与客户咨询管理',
    },
    components: {
      graphics: { Logo: '@/app/admin/components/BrandLogo' },
      beforeLogin: ['@/app/admin/components/LoginIntro'],
      beforeNavLinks: ['@/app/admin/components/PrimaryNav'],
      views: {
        tencentSync: {
          Component: '@/app/admin/components/TencentSyncRoute',
          path: '/workspace/sync',
        },
        dashboard: {
          // No AdminWorkspaceShell — dashboard already has DefaultTemplate.
          Component: '@/app/admin/components/OpsWorkbenchRoute',
        },
        qualityWorkspace: {
          Component: '@/app/admin/components/QualityWorkspaceRoute',
          path: '/workspace/quality',
        },
        shareWorkspace: {
          Component: '@/app/admin/components/ShareWorkspaceRoute',
          path: '/workspace/share',
        },
        inquiryInbox: {
          // Custom multi-segment paths need AdminWorkspaceShell for chrome.
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
    // Export explicit collection types for application code.
    declare: false,
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
