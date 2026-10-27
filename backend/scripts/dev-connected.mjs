import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const children = [
  spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, [require.resolve('tsx/cli'), 'scripts/sync-tencent.ts', '--watch'], { stdio: 'inherit', env: process.env }),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = code
}
process.once('SIGINT', () => stop())
process.once('SIGTERM', () => stop())
for (const child of children) {
  child.once('error', () => stop(1))
  child.once('exit', code => { if (!stopping) stop(code || 0) })
}
