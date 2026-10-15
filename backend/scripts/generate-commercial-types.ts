import config from '../payload.config'
import { generateTypes } from '../node_modules/payload/dist/bin/generateTypes.js'
async function main() { await generateTypes(await config) }
main().catch(error => { console.error(error); process.exitCode = 1 })
