import { getPayload } from 'payload'

async function main() {
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
