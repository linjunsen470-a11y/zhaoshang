import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getPayload } from 'payload'

const isolated = new URL(process.env.DATABASE_URI || 'http://unset').pathname === '/zhaoshang_commercial_test_20260922'
if (!isolated) throw new Error('Run only through tests/with-commercial-db.mjs with the isolated localhost:3100 service')
const base = 'http://127.0.0.1:3100/api'

test('prelaunch HTTP security and attachment lifecycle', { timeout: 240_000 }, async t => {
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const suffix = randomUUID()
  const users: (string | number)[] = []
  const projects: (string | number)[] = []
  const mediaIds: (string | number)[] = []
  const leads: string[] = []
  const call = (path: string, options: RequestInit = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(60_000) })
  const post = (path: string, body: unknown, token?: string, method = 'POST') => call(path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
  const login = async (label: string) => {
    const response = await post('/auth/wechat-login', { devOpenId: `prelaunch-${suffix}-${label}` })
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.mode, 'dev')
    return data.token as string
  }
  let owner = ''
  t.after(async () => {
    for (const id of leads) await call(`/leads/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${owner}` } }).catch(() => {})
    for (const id of projects.reverse()) await payload.delete({ collection: 'projects', id, overrideAccess: true }).catch(() => {})
    for (const id of mediaIds) await payload.delete({ collection: 'media', id, overrideAccess: true }).catch(() => {})
    for (const id of users) await payload.delete({ collection: 'users', id, overrideAccess: true }).catch(() => {})
    await payload.destroy()
  })
  owner = await login('owner')
  const foreign = await login('foreign')
  const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#334155' } }).png().toBuffer()
  const fixture = await payload.create({ collection: 'media', data: { source: 'admin', alt: '审计测试图' }, file: { data: image, mimetype: 'image/png', name: `prelaunch-${suffix}.png`, size: image.length }, overrideAccess: true })
  mediaIds.push(fixture.id)
  const draft = await payload.create({ collection: 'projects', data: { title: `prelaunch-${suffix}`, city: '广州', district: '天河', feeText: '测试费用', customerInfo: '审计测试客群', status: 'draft', coverImage: fixture.id, images: [fixture.id] }, overrideAccess: true })
  projects.push(draft.id)

  await t.test('anonymous and mini-program users cannot read drafts or staff endpoints', async () => {
    assert.equal((await call(`/projects/${draft.id}`)).status, 404)
    assert.equal((await call(`/payload/projects/${draft.id}`)).status, 404)
    for (const path of ['/stats', '/admin/properties', '/admin/inquiries', '/admin/equipment', '/admin/ops-workbench', '/admin/wechat-code']) {
      const response = await call(path, { headers: { Authorization: `Bearer ${owner}` } })
      assert.ok([401, 403].includes(response.status), `${path}: ${response.status}`)
    }
    assert.equal((await call('/leads')).status, 401)
    assert.equal((await post('/projects', { title: '越权' }, owner)).status, 403)
    assert.equal((await post('/payload/leads', { name: '越权', phone: '13812345678', status: 'closed' })).status, 403)
  })

  await t.test('malformed and oversized request bodies return client errors', async () => {
    for (const input of [null, [], 'text']) assert.equal((await post('/auth/wechat-login', input)).status, 400)
    assert.equal((await post('/leads', null, owner)).status, 400)
    assert.equal((await post('/leads', { remark: 'x'.repeat(70_000) }, owner)).status, 413)
  })

  let attachment: { id: string; url: string }
  let leadId = ''
  await t.test('actual upload previews with signed URL; bare file and altered signatures are denied', async () => {
    const form = new FormData()
    form.set('file', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'test.png')
    const upload = await call('/uploads/lead-image', { method: 'POST', headers: { Authorization: `Bearer ${owner}` }, body: form })
    assert.equal(upload.status, 201)
    attachment = await upload.json()
    mediaIds.push(attachment.id)
    const preview = await fetch(attachment.url)
    assert.equal(preview.status, 200)
    assert.equal(preview.headers.get('content-type'), 'image/png')
    assert.equal(preview.headers.get('cache-control'), 'private, no-store')
    const bare = new URL(attachment.url); bare.search = ''
    assert.equal((await fetch(bare)).status, 404)
    assert.equal((await fetch(attachment.url + 'x')).status, 404)
    const raw = await payload.findByID({ collection: 'media', id: attachment.id, overrideAccess: true })
    assert.ok([401, 403, 404].includes((await call(`/payload/media/file/${raw.filename}`)).status))
  })

  await t.test('creates isolated lead and rejects public/foreign/unclassified attachments', async () => {
    const body = { name: '审计测试', phone: '13812345678', businessScene: 'campus', hasCampusExperience: true, attachments: [attachment.id], status: 'closed', sourceChannel: 'admin', internalNote: '不应写入' }
    const created = await post('/leads', body, owner)
    assert.equal(created.status, 201)
    const data = await created.json()
    leadId = data.id; leads.push(leadId)
    assert.equal(data.status, 'new')
    assert.equal(data.sourceChannel, 'mini_program')
    assert.equal('submitterOpenId' in data, false)
    assert.equal('internalNote' in data, false)
    assert.equal((await post('/leads', { ...body }, foreign)).status, 403)
    assert.equal((await post('/leads', { ...body, attachments: [fixture.id] }, owner)).status, 403)
    const unknown = await payload.create({ collection: 'media', data: { alt: '无来源附件' }, file: { data: image, mimetype: 'image/png', name: `unknown-${suffix}.png`, size: image.length }, overrideAccess: true })
    mediaIds.push(unknown.id)
    assert.equal((await post('/leads', { ...body, attachments: [unknown.id] }, owner)).status, 403)
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = method === 'PUT' ? await post(`/leads/${leadId}`, { remark: '越权' }, foreign, method) : await call(`/leads/${leadId}`, { method, headers: { Authorization: `Bearer ${foreign}` } })
      assert.equal(response.status, 403)
    }
  })

  await t.test('partial edits preserve experience; removal retains original media until lead deletion', async () => {
    const updated = await post(`/leads/${leadId}`, { remark: '补充' }, owner, 'PUT')
    assert.equal(updated.status, 200)
    const data = await updated.json()
    assert.equal(data.hasCampusExperience, true)
    assert.equal(data.businessScene, 'campus')
    assert.equal(data.attachments.length, 1)
    assert.equal((await post(`/leads/${leadId}`, { attachments: [] }, owner, 'PUT')).status, 200)
    assert.equal((await fetch(attachment.url)).status, 200)
    assert.equal((await call(`/leads/${leadId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${owner}` } })).status, 200)
    leads.splice(leads.indexOf(leadId), 1)
    assert.equal((await fetch(attachment.url)).status, 404)
  })

  await t.test('editor can view a draft but cannot delete projects or create admin accounts', async () => {
    const password = randomUUID() + randomUUID()
    const email = `prelaunch-${suffix}@example.invalid`
    const editor = await payload.create({ collection: 'users', data: { email, password, role: 'editor' }, overrideAccess: true })
    users.push(editor.id)
    const response = await post('/payload/users/login', { email, password })
    assert.equal(response.status, 200)
    const cookies = response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
    assert.ok(cookies)
    assert.equal((await call(`/projects/${draft.id}`, { headers: { Cookie: cookies } })).status, 200)
    assert.equal((await call(`/projects/${draft.id}`, { method: 'DELETE', headers: { Cookie: cookies } })).status, 403)
    assert.equal((await call('/payload/users', { method: 'POST', headers: { Cookie: cookies, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'forbidden@example.invalid', password, role: 'admin' }) })).status, 403)
    assert.equal((await call('/admin/inquiries', { method: 'PATCH', headers: { Cookie: cookies, 'Content-Type': 'application/json' }, body: 'null' })).status, 400)
  })
})
