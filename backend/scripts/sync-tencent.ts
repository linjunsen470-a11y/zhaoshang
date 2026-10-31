import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import { getSyncConfig, syncErrorMessage, writeSyncFile } from '../lib/tencent/config'
import { runTencentSync } from '../lib/tencent/sync'

try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }

async function main() {
  const watching = process.argv.includes('--watch')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  let stopped = false
  const stop = () => { stopped = true }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    do {
      const settings = await getSyncConfig()
      await writeSyncFile('worker.json', { heartbeatAt: new Date().toISOString(), pid: process.pid })
      if (!watching || settings.enabled) {
        const report = await runTencentSync(payload, watching ? 'scheduled' : 'command')
        console.log(JSON.stringify(report))
        if (!watching && report.errors.length) process.exitCode = 1
      }
      if (!watching) break
      const nextAt = Date.now() + settings.intervalMinutes * 60_000
      while (!stopped && Date.now() < nextAt) {
        await new Promise(resolve => setTimeout(resolve, 5_000))
        await writeSyncFile('worker.json', { heartbeatAt: new Date().toISOString(), pid: process.pid })
      }
    } while (!stopped)
  } finally {
    await writeSyncFile('worker.json', { heartbeatAt: null, pid: null })
    await payload.destroy()
  }
}
main().then(() => process.exit(process.exitCode || 0)).catch(error => { console.error(syncErrorMessage(error)); process.exit(1) })
