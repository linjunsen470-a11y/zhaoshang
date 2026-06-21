/**
 * push-schema.mjs – Plain ESM script that pushes Payload's Drizzle schema
 * to PostgreSQL.  Uses tsx/esm/api the same way Payload's own CLI does,
 * so it avoids the CJS / ESM interop issues that plague `node --import tsx`.
 *
 * Run with:  node scripts/push-schema.mjs
 */

import { pathToFileURL } from 'node:url'

async function main() {
  // Force development mode so drizzle-kit push is enabled
  process.env.NODE_ENV = 'development'
  process.env.PAYLOAD_DB_PUSH = 'true'

  // Use tsx/esm/api to import the TypeScript payload config
  const { tsImport } = await import('tsx/esm/api')
  const parentURL = import.meta.url
  const { default: config } = await tsImport('../payload.config.ts', parentURL)

  // Import getPayload through the same tsx loader to keep resolution consistent
  const { getPayload } = await tsImport('payload', parentURL)

  const payload = await getPayload({ config })
  console.log('Schema push completed successfully.')
  await payload.destroy()
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema push failed:', err)
  process.exit(1)
})
