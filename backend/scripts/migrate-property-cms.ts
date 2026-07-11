import { getPayload } from 'payload'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

function loadLocalEnv() {
  try {
    loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

function safeBackupSuffix() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
}

async function main() {
  loadLocalEnv()
  process.env.PAYLOAD_DB_PUSH = 'false'
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const client = await payload.db.pool.connect()
  const suffix = safeBackupSuffix()

  try {
    await client.query('BEGIN')
    await client.query('CREATE SCHEMA IF NOT EXISTS cms_backup')
    const existingTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
    const tables = new Set(existingTables.rows.map(row => row.table_name))
    for (const table of ['projects', 'leads', 'users', 'media', 'merchant_profiles', 'follow_records']) {
      if (tables.has(table)) await client.query(`CREATE TABLE cms_backup.${table}_${suffix} AS TABLE public.${table}`)
    }

    const columnsResult = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('projects', 'leads')`,
    )
    const columns = new Set(columnsResult.rows.map(row => `${row.table_name}.${row.column_name}`))

    if (columns.has('projects.audit_status')) {
      const completenessClause = columns.has('projects.content_completeness')
        ? ` OR content_completeness = 'incomplete'`
        : ''
      await client.query(`UPDATE projects SET status = 'draft' WHERE status IN ('online', 'coming', 'full') AND (audit_status IS DISTINCT FROM 'approved'${completenessClause})`)
    }

    await client.query(`UPDATE leads SET status = (CASE WHEN status = 'new' THEN 'new' WHEN status IN ('contacted', 'interested', 'viewing_scheduled', 'viewed', 'negotiating') THEN 'contacted' ELSE 'closed' END)::enum_leads_status`)
    await client.query(`UPDATE users SET role = 'editor' WHERE role = 'advisor'`)

    if (!columns.has('leads.equipment_publication_status')) {
      await client.query(`ALTER TABLE leads ADD COLUMN equipment_publication_status varchar DEFAULT 'draft'`)
    }
    if (columns.has('leads.equipment_publication_publish_status')) {
      const publicCheck = columns.has('leads.equipment_publication_is_public')
        ? ` AND equipment_publication_is_public = true`
        : ''
      await client.query(`UPDATE leads SET equipment_publication_status = CASE WHEN equipment_publication_publish_status = 'approved'${publicCheck} THEN 'online' WHEN equipment_publication_publish_status = 'offline' THEN 'offline' ELSE 'draft' END`)
    }

    await client.query('COMMIT')
    payload.logger.info(`CMS data migration completed. Backup suffix: ${suffix}`)
    payload.logger.info('Next: run the Payload schema push to remove retired CRM columns and tables.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await payload.destroy()
  }
}

main().catch(error => {
  console.error('Property CMS migration failed:', error)
  process.exit(1)
})
