// One-off demo import from a snapshot read with the connected Tencent Docs plugin.
// This does not configure or impersonate an unattended MCP connection.
import { loadEnvFile } from 'node:process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import { getSyncConfig } from '../lib/tencent/config'
import { runTencentSync } from '../lib/tencent/sync'
import type { DocsClient } from '../lib/tencent/client'

try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.WECHAT_AUTH_MODE !== 'dev') throw new Error('Snapshot import is only available in a local demo')
  const filename = process.argv[2]
  if (!filename) throw new Error('Provide the live Tencent property snapshot JSON path')
  const snapshot = JSON.parse(await readFile(filename, 'utf8'))
  if (!Array.isArray(snapshot.records) || snapshot.has_more) throw new Error('A complete records snapshot is required')
  const docs: DocsClient = {
    async call(method) {
      if (method === 'smartsheet.list_views') return { views: [{ view_id: 'snapshot', view_name: '全部房源', config: JSON.stringify({ filterSpec: { '2': [] } }) }] }
      if (method !== 'smartsheet.list_records') throw new Error('Snapshot mode cannot write to Tencent Docs')
      return snapshot
    }, async close() {},
  }
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  try {
    const settings = { ...await getSyncConfig(), importProperties: true, exportLeads: false }
    const report = await runTencentSync(payload, 'assistant-demo-import', docs, settings)
    console.log(JSON.stringify(report))
    if (report.errors.length) process.exitCode = 1
  } finally { await payload.destroy() }
}
main().then(() => process.exit(process.exitCode || 0)).catch(error => { console.error(error.message); process.exit(1) })
