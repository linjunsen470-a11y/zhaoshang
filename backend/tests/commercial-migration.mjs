import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'

if (new URL(process.env.DATABASE_URI || '').pathname !== '/zhaoshang_commercial_test_20260922') throw new Error('Isolated test database required')
const require = createRequire(import.meta.url)
const { Client } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
const db = new Client({ connectionString: process.env.DATABASE_URI })
await db.connect()
try {
  const sql = await readFile(new URL('../scripts/migrate-commercial.sql', import.meta.url), 'utf8')
  const snapshots = (await db.query('SELECT id, customer_snapshot FROM leads ORDER BY id')).rows
  await db.query('BEGIN')
  await db.query('ALTER TABLE projects ALTER COLUMN listing_kind DROP NOT NULL')
  const ids = []
  for (const type of ['食堂档口', '其他', '店铺转让']) {
    const result = await db.query("INSERT INTO projects (title, cover_image_id, project_type, listing_kind, fee_text) VALUES ($1, (SELECT id FROM media LIMIT 1), $2, NULL, '5000元/月') RETURNING id", [`迁移历史样例-${type}`, type])
    ids.push(result.rows[0].id)
  }
  await db.query('COMMIT')
  await db.query(sql)
  const read = () => db.query('SELECT id, listing_kind, business_scene, legacy_unclassified, area_min, monthly_rent_min FROM projects WHERE id = ANY($1) ORDER BY id', [ids])
  const first = (await read()).rows
  assert.equal(first[0].business_scene, 'campus')
  assert.equal(first[0].legacy_unclassified, false)
  assert.ok(first.slice(1).every(row => row.business_scene === null && row.legacy_unclassified))
  assert.ok(first.every(row => row.listing_kind === 'unit' && row.area_min === null && row.monthly_rent_min === null))
  await db.query(sql)
  assert.deepEqual((await read()).rows, first)
  assert.deepEqual((await db.query('SELECT id, customer_snapshot FROM leads ORDER BY id')).rows, snapshots)
  console.log('PASS: legacy campus/other/transfer classification, unchanged IDs/snapshots, no text rent inference, idempotent migration')
} finally { await db.end() }
