import assert from 'node:assert/strict'
import sharp from 'sharp'

// The dedicated dev service must be started with tests/with-commercial-db.mjs.
if (process.env.COMMERCIAL_TEST_CONFIRM_ISOLATED !== 'true') throw new Error('Confirm the localhost:3100 service uses the isolated commercial DB')
const base = 'http://127.0.0.1:3100/api'
const request = async (path, method = 'GET', body, token) => {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: response.status, data: await response.json() }
}
const run = Date.now()
const login = async suffix => {
  const result = await request('/auth/wechat-login', 'POST', { devOpenId: `commercial-http-${run}-${suffix}` })
  assert.equal(result.data.mode, 'dev')
  return result.data.token
}
const token = await login('owner'), foreign = await login('foreign')
const projects = await request('/projects?pagination=true&businessScene=community&listingKind=project')
assert.equal(projects.status, 200)
const project = projects.data.docs.find(p => p.status === 'online')
assert.ok(project)
for (const scene of ['campus', 'community', 'tourism', 'mall']) {
  const result = await request(`/projects?pagination=true&businessScene=${scene}`)
  assert.equal(result.status, 200)
  assert.ok(result.data.totalDocs > 0)
  assert.ok(result.data.docs.every(p => p.businessScene === scene))
}
const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#334155' } }).png().toBuffer()
const form = new FormData()
form.set('file', new Blob([image], { type: 'image/png' }), 'commercial-test.png')
const upload = await fetch(base + '/uploads/lead-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
assert.equal(upload.status, 201)
const attachment = await upload.json()
const created = await request('/leads', 'POST', { name: '商业接口测试', phone: '13812345678', projectId: project.id, businessScene: 'mall', remark: 'HTTP联调', attachments: [attachment.id], assignedTo: 1, status: 'closed' }, token)
assert.equal(created.status, 201)
const id = created.data.id
try {
  assert.equal(String(created.data.attachments[0].id), String(attachment.id))
  assert.equal((await request('/leads', 'POST', { name: '越权附件', phone: '13812345678', attachments: [attachment.id] }, foreign)).status, 403)
  const rawProject = await request(`/payload/projects/${project.id}`)
  assert.equal(rawProject.status, 200)
  assert.equal('remark' in rawProject.data, false)
  assert.equal((await request('/leads', 'POST', { name: '公开图拒绝', phone: '13812345678', attachments: [rawProject.data.coverImage.id] }, token)).status, 403)
  assert.equal(created.data.businessScene, 'community')
  assert.equal(String(created.data.projectId), project.id)
  assert.equal(created.data.status, 'new')
  assert.equal('submitterOpenId' in created.data, false)
  assert.equal('assignedTo' in created.data, false)
  const updated = await request(`/leads/${id}`, 'PUT', { name: '修改咨询', phone: '13812345678', projectId: '999999999', businessScene: 'mall', remark: '补充面积要求' }, token)
  assert.equal(updated.status, 200)
  assert.equal(String(updated.data.projectId), project.id)
  assert.equal(updated.data.businessScene, 'community')
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request(`/leads/${id}`, method, method === 'PUT' ? { remark: '越权' } : undefined, foreign)).status, 403)
  assert.equal((await request('/leads')).status, 401)
  assert.equal((await request('/leads', 'POST', { name: '附件测试', phone: '13812345678', attachments: ['999999999'] }, token)).status, 400)
} finally { assert.equal((await request(`/leads/${id}`, 'DELETE', undefined, token)).status, 200) }
assert.equal((await request(`/leads/${id}`, 'GET', undefined, token)).status, 404)
console.log('PASS: all scene APIs, associated consultation create/edit/delete, stable object/scene, cross-user isolation, real attachment upload, foreign/seed attachment rejection and public internal-field protection')
