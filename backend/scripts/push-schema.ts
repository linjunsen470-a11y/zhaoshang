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

async function main() {
  loadLocalEnv()
  Object.assign(process.env, {
    NODE_ENV: 'development',
    PAYLOAD_DB_PUSH: 'true',
  })

  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })

  await payload.destroy()
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema push failed:', err)
  process.exit(1)
})
