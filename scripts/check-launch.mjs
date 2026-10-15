import { existsSync, readFileSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { runInNewContext } from 'node:vm'

const root = new URL('../', import.meta.url)
for (const file of ['.env', 'backend/.env']) {
  const path = new URL(file, root)
  if (existsSync(path)) loadEnvFile(path)
}
const clientModule = { exports: {} }
runInNewContext(readFileSync(new URL('mp/config/environments.js', root), 'utf8'), { module: clientModule }, { timeout: 1000 })
const environments = clientModule.exports
const configText = readFileSync(new URL('mp/config/index.js', root), 'utf8')
const phone = configText.match(/ADVISOR_PHONE:\s*['"]([^'"]*)['"]/)?.[1]
const errors = []
const check = (ok, message) => { if (!ok) errors.push(message) }
const placeholder = value => !value || /change.this|your[-_]|example|fallback|local-dev|placeholder|use-a-different/i.test(value)
function publicHttps(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && !/^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|\.localhost$/i.test(url.hostname)
      && !/(?:^|\.)example\.(?:com|net|org)$|\.example$|^your-domain\.com$/i.test(url.hostname)
  } catch { return false }
}

for (const version of ['trial', 'release']) {
  const env = environments[version]
  check(publicHttps(env?.apiUrl), `${version} API 地址须填写真实 HTTPS 域名`)
  check(!env?.useLocalMock && !env?.allowDevOpenId, `${version} 必须关闭本地 Mock 和开发 OpenID`)
}
check(/^1[3-9]\d{9}$/.test(phone || '') && phone !== '18888888888', '顾问电话须替换占位号码')
for (const key of ['PAYLOAD_SECRET', 'MINIPROGRAM_TOKEN_SECRET']) {
  check(!placeholder(process.env[key]) && process.env[key].length >= 32, `${key} 须配置至少 32 字符的独立随机密钥`)
}
check(process.env.PAYLOAD_SECRET !== process.env.MINIPROGRAM_TOKEN_SECRET, '两个服务密钥必须不同')
check(process.env.WECHAT_AUTH_MODE === 'wechat', 'WECHAT_AUTH_MODE 必须为 wechat')
check(!placeholder(process.env.WECHAT_APP_SECRET), 'WECHAT_APP_SECRET 尚未配置真实值')
const project = JSON.parse(readFileSync(new URL('mp/project.config.json', root), 'utf8'))
check(process.env.WECHAT_APPID === project.appid, 'WECHAT_APPID 必须与小程序 appid 一致')
check(process.env.WECHAT_CODE_ENV_VERSION === 'release', 'WECHAT_CODE_ENV_VERSION 必须为 release')
check(publicHttps(process.env.PAYLOAD_PUBLIC_SERVER_URL), 'PAYLOAD_PUBLIC_SERVER_URL 须使用真实 HTTPS 域名')
check(process.env.PAYLOAD_DB_PUSH === 'false', '正常生产启动须显式设置 PAYLOAD_DB_PUSH=false')
check(!placeholder(process.env.DATABASE_URI) && /^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URI || ''), 'DATABASE_URI 须配置 PostgreSQL 连接')

if (errors.length) {
  console.error('发布配置检查未通过：')
  errors.forEach(message => console.error(`- ${message}`))
  process.exitCode = 1
} else {
  console.log('发布配置静态检查通过；仍须完成合法域名、真实微信登录、备份恢复和真机验收。')
}
