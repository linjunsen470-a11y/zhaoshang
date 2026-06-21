import { buildConfig, type SharpDependency } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Projects } from './collections/Projects'
import { Leads } from './collections/Leads'
import { FollowRecords } from './collections/FollowRecords'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { MerchantProfiles } from './collections/MerchantProfiles'

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
      title: '校园商铺招商管理台',
      description: '管理招商项目、咨询线索与商户档案',
    },
    components: {
      beforeDashboard: ['@/app/admin/components/OperationsDashboard'],
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
    MerchantProfiles,
    Media,
    Users,
    FollowRecords,
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
