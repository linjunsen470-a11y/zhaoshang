import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadEnvFile } from 'node:process'
import { randomBytes, createHmac } from 'node:crypto'
import { createRequire } from 'node:module'

loadEnvFile(new URL('../backend/.env', import.meta.url))
const run = promisify(execFile)
const name = 'zhaoshang-audit-app-20261012'
const volume = 'zhaoshang-audit-media-20261012'
const uri = new URL(process.env.DATABASE_URI)
uri.hostname = 'host.docker.internal'
uri.pathname = '/zhaoshang_commercial_test_20260922'
const tokenSecret = randomBytes(32).toString('hex')
const env = {
  DATABASE_URI: uri.toString(), PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  MINIPROGRAM_TOKEN_SECRET: tokenSecret, PAYLOAD_DB_PUSH: 'false',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://127.0.0.1:3110', WECHAT_AUTH_MODE: 'dev',
}
const docker = async args => {
  try { return await run('docker', args, { windowsHide: true, maxBuffer: 1024 * 1024, timeout: 90_000 }) }
  catch (error) { throw new Error(`Docker operation failed (${error.code}); inspect the named audit container without printing environment secrets.`) }
}
const base = 'http://127.0.0.1:3110'
let leadId
let uploaded
let created = false
const body = Buffer.from(JSON.stringify({ openid: 'docker-audit-20261012', exp: Date.now() + 600_000 })).toString('base64url')
const token = `${body}.${createHmac('sha256', tokenSecret).update(body).digest('base64url')}`
const auth = { Authorization: `Bearer ${token}` }
const call = (path, options = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(30_000) })
try {
  await docker(['run', '-d', '--name', name, '-p', '127.0.0.1:3110:3000', '--mount', `source=${volume},target=/app/media`, ...Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${value}`]), 'zhaoshang-audit:20261012'])
  created = true
  let ready = false
  for (let i = 0; i < 40; i++) {
    try { if ((await call('/api/projects')).status === 200) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.ok(ready, 'production container should become ready')
  assert.equal((await call('/')).status, 200)
  assert.equal((await call('/admin')).status, 200)
  assert.equal((await call('/api/leads')).status, 401)
  const dev = await call('/api/auth/wechat-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ devOpenId: 'illegal-production-dev' }) })
  assert.equal(dev.status, 400, 'production rejects dev login even if WECHAT_AUTH_MODE=dev')
  const require = createRequire(new URL('../backend/package.json', import.meta.url))
  const sharp = require('sharp')
  const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#123456' } }).png().toBuffer()
  const form = new FormData()
  form.set('file', new Blob([image], { type: 'image/png' }), 'docker-audit.png')
  const upload = await call('/api/uploads/lead-image', { method: 'POST', headers: auth, body: form })
  assert.equal(upload.status, 201, 'Alpine Sharp and non-root volume upload')
  uploaded = await upload.json()
  assert.equal((await fetch(uploaded.url)).status, 200)
  assert.equal((await call(`/api/uploads/lead-image/${uploaded.id}`)).status, 404)
  const lead = await call('/api/leads', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ leadType: 'equipment_sell', name: '容器审计', phone: '13812345678', remark: 'docker-audit-20261012', attachments: [uploaded.id] }) })
  assert.equal(lead.status, 201)
  leadId = (await lead.json()).id
  await docker(['restart', name])
  let restored = false
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(uploaded.url)).status === 200) { restored = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.ok(restored, 'uploaded image survives container restart')
  assert.equal((await call(`/api/leads/${leadId}`, { method: 'DELETE', headers: auth })).status, 200)
  leadId = null
  assert.equal((await fetch(uploaded.url)).status, 404)
  const uid = await docker(['exec', name, 'id', '-u'])
  assert.equal(uid.stdout.trim(), '1001')
  console.log('Docker production smoke PASS: website/admin/API, dev-login rejection, Sharp upload, private image, lead lifecycle, UID 1001, volume write and restart persistence.')
} finally {
  if (leadId) await call(`/api/leads/${leadId}`, { method: 'DELETE', headers: auth }).catch(() => {})
  if (created) {
    await docker(['rm', '-f', name]).catch(() => {})
    await docker(['volume', 'rm', volume]).catch(() => {})
  }
}
