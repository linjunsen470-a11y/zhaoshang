import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'

const sql = await readFile(new URL('./migrate-payload-auth.sql', import.meta.url), 'utf8')
if (!process.argv.includes('--apply')) {
  console.log(sql)
  console.log('Preview only. Back up the target database, then pass --apply to execute.')
} else {
  try { loadEnvFile(new URL('../.env', import.meta.url)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is required')
  const require = createRequire(import.meta.url)
  const { Client } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
  const db = new Client({ connectionString: process.env.DATABASE_URI, connectionTimeoutMillis: 5000 })
  await db.connect()
  try {
    await db.query(sql)
    console.log('Payload auth migration complete; existing accounts preserved.')
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally { await db.end() }
}
