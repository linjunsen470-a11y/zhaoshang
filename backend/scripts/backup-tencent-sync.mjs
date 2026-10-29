import { loadEnvFile } from 'node:process'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
loadEnvFile(new URL('../.env', import.meta.url))
const require = createRequire(import.meta.url)
const { Client } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
const target = new URL(process.env.DATABASE_URI)
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/zhaoshang_tencent_demo_20261024') throw new Error('This backup command is restricted to the local Tencent demo database')
const db = new Client({ connectionString: process.env.DATABASE_URI, connectionTimeoutMillis: 5000 })
await db.connect()
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ')
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).rows
  const quote = value => '"' + value.replaceAll('"', '""') + '"'
  const backup = { database: target.pathname.slice(1), capturedAt: new Date().toISOString(), tables: {}, columns: (await db.query("SELECT * FROM information_schema.columns WHERE table_schema = 'public'")).rows, enums: (await db.query('SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid ORDER BY t.typname,e.enumsortorder')).rows }
  for (const { tablename } of tables) backup.tables[tablename] = (await db.query(`SELECT * FROM public.${quote(tablename)}`)).rows
  const directory = new URL('../../scratch/backups/', import.meta.url)
  await mkdir(directory, { recursive: true })
  const filename = new URL(`tencent-sync-${Date.now()}.json`, directory)
  await writeFile(filename, JSON.stringify(backup), { mode: 0o600, flag: 'wx' })
  await db.query('COMMIT')
  console.log(`Backup saved: ${filename.pathname}; ${tables.length} tables`)
} finally { await db.end() }
