import { loadEnvFile } from 'node:process'
import { getPayload } from 'payload'
import { cleanupExpiredAttachments } from '../lib/attachmentCleanup'

try { loadEnvFile(new URL('../.env', import.meta.url)) }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
process.env.PAYLOAD_DB_PUSH = 'false'

async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--delete')) throw new Error('仅支持 --delete；默认预览，不删除文件')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  try { console.log(JSON.stringify(await cleanupExpiredAttachments(payload, !process.argv.includes('--delete')))) }
  finally { await payload.destroy() }
}
main().then(() => process.exit(0)).catch(() => {
  console.error('附件清理失败，请检查数据库连接和服务器日志')
  process.exit(1)
})
