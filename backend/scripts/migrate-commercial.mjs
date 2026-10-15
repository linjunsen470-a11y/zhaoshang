import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
const sql = await readFile(new URL('./migrate-commercial.sql', import.meta.url), 'utf8')
if (!process.argv.includes('--apply')) {
  console.log(sql)
  console.log('-- Preview only. Back up the database, then pass --apply to execute.')
} else {
  try { loadEnvFile(new URL('../.env', import.meta.url)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is required')
  const require = createRequire(import.meta.url)
  const { Client } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()
  try {
    await client.query(sql)
    console.log('Commercial migration complete; historical rows and snapshots preserved.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { await client.end() }
}
