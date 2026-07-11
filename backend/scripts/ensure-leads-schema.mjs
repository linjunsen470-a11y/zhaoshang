/**
 * Non-interactive schema fixes for leads that Payload push may block on
 * (interactive enum rename prompts after CRM migration leftovers).
 *
 * Usage: pnpm --dir backend exec node scripts/ensure-leads-schema.mjs
 */
import { createRequire } from 'node:module'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pg = require(join(dirname(fileURLToPath(import.meta.url)), '../node_modules/.pnpm/pg@8.20.0/node_modules/pg'))

try {
  loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI missing in backend/.env')
  process.exit(1)
}

const client = new pg.Client({ connectionString: uri })
await client.connect()

async function columnExists(table, column) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return res.rowCount > 0
}

// 1) customer_snapshot for dual-view original submission
if (!(await columnExists('leads', 'customer_snapshot'))) {
  await client.query('ALTER TABLE leads ADD COLUMN customer_snapshot jsonb')
  console.log('✓ added leads.customer_snapshot (jsonb)')
} else {
  console.log('· leads.customer_snapshot already present')
}

// 2) Best-effort backfill from flattened group columns
const backfill = await client.query(`
  UPDATE leads
  SET customer_snapshot = jsonb_strip_nulls(jsonb_build_object(
    'capturedAt', COALESCE(created_at::text, now()::text),
    'name', COALESCE(name, ''),
    'phone', COALESCE(phone, ''),
    'leadType', COALESCE(lead_type::text, 'leasing'),
    'sourceChannel', COALESCE(source_channel::text, 'mini_program'),
    'businessType', COALESCE(business_type, ''),
    'budgetRange', COALESCE(budget_range, ''),
    'regionPreference', COALESCE(region_preference, ''),
    'hasCampusExperience', COALESCE(has_campus_experience, false),
    'remark', COALESCE(remark, ''),
    'projectId', project_id,
    'transferDetails', jsonb_strip_nulls(jsonb_build_object(
      'locationText', transfer_details_location_text,
      'feeText', transfer_details_fee_text,
      'transferFee', transfer_details_transfer_fee,
      'remainingTerm', transfer_details_remaining_term,
      'includesEquipment', transfer_details_includes_equipment
    )),
    'equipmentDetails', jsonb_strip_nulls(jsonb_build_object(
      'equipmentName', equipment_details_equipment_name,
      'specText', equipment_details_spec_text,
      'equipmentCondition', equipment_details_equipment_condition,
      'expectedPrice', equipment_details_expected_price
    )),
    'renovationDetails', jsonb_strip_nulls(jsonb_build_object(
      'shopArea', renovation_details_shop_area,
      'renovationType', renovation_details_renovation_type::text,
      'designStyle', renovation_details_design_style,
      'budgetText', renovation_details_budget_text,
      'expectedStartDate', renovation_details_expected_start_date
    ))
  ))
  WHERE customer_snapshot IS NULL
`)
console.log(`✓ backfilled customer_snapshot for ${backfill.rowCount} row(s)`)

// 3) Smoke test
const sample = await client.query(`
  SELECT id, name, lead_type::text AS lead_type, status::text AS status,
         (customer_snapshot IS NOT NULL) AS has_snapshot
  FROM leads
  ORDER BY created_at DESC NULLS LAST
  LIMIT 5
`)
console.log('sample:', sample.rows)

await client.end()
console.log('Schema ensure complete.')
