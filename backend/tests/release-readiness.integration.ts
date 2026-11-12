import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import { GET as projects } from '../app/api/projects/route'
import { GET as leads, POST as createLead } from '../app/api/leads/route'
import { signAuthToken } from '../app/api/_shared/tokens'

test('project discovery and consultation retries on an isolated database', async () => {
  const uri = new URL(process.env.DATABASE_URI || 'http://unset')
  assert.equal(uri.hostname, '127.0.0.1')
  assert.equal(uri.pathname, '/zhaoshang_commercial_test_20260922')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const suffix = randomUUID()
  const schoolName = '测试学院' + suffix
  const owner = 'test-' + suffix
  const headers = { Authorization: 'Bearer ' + signAuthToken(owner), 'Content-Type': 'application/json' }
  const create = (body: Record<string, unknown>) => createLead(new Request('http://localhost/api/leads', { method: 'POST', headers, body: JSON.stringify({ phone: '13812345678', ...body }) }))
  const projectIds: (number | string)[] = []
  let mediaId: string | number | undefined
  try {
    const data = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#456789' } }).png().toBuffer()
    const image = await payload.create({ collection: 'media', data: { source: 'admin', alt: '隔离测试图' }, file: { name: suffix + '.png', data, mimetype: 'image/png', size: data.length } })
    mediaId = image.id
    for (const extra of [{}, { areaMin: 50, areaMax: 50 }, { status: 'offline' }]) {
      const p = await payload.create({ collection: 'projects', data: { title: schoolName + '食堂', schoolName, schoolAlias: '测试别名', addressText: '测试别名一楼', district: '天河', city: '广州', businessScene: 'campus', status: 'online', coverImage: image.id, images: [image.id], feeText: '面议', customerInfo: '测试', ...extra } })
      projectIds.push(p.id)
    }
    const find = async (params: Record<string, string>) => {
      const response = await projects(new Request('http://localhost/api/projects?' + new URLSearchParams({ ids: projectIds.join(','), ...params })))
      assert.equal(response.status, 200)
      return response.json()
    }
    for (const area of ['under50', '50to100', '100to200', '200plus']) {
      const page = await find({ area })
      assert.equal(page.totalDocs, area === '50to100' ? 2 : 1)
      assert.ok(page.docs.some((row: { id: string }) => row.id === String(projectIds[0])))
    }
    assert.equal((await find({ area: 'under50', rent: 'under5000' })).totalDocs, 0)
    assert.equal((await find({ q: schoolName })).totalDocs, 0)
    assert.equal((await find({ q: '测试别名' })).totalDocs, 0)
    const second = await find({ q: '广州天河某学校食堂', page: '2', limit: '1' })
    assert.equal(second.totalDocs, 2)
    assert.equal(second.docs.length, 1)
    assert.equal(second.hasNextPage, false)

    const body = { projectId: projectIds[0], submissionId: randomUUID() }
    const attempts = await Promise.all([create(body), create(body)])
    assert.deepEqual(attempts.map(res => res.status).sort(), [200, 201])
    const [first, retry] = await Promise.all(attempts.map(res => res.json()))
    assert.equal(first.id, retry.id)
    assert.equal(String(first.projectId), String(projectIds[0]))
    assert.equal((await create({ projectId: projectIds[2] })).status, 400)
    assert.equal((await create({ projectId: projectIds[0], project: projectIds[2] })).status, 400)
    assert.equal((await create({ submissionId: randomUUID() })).status, 201)
    const page = await (await leads(new Request('http://localhost/api/leads?page=2&limit=1', { headers }))).json()
    assert.equal(page.docs.length, 1)
    assert.equal(page.totalDocs, 2)
  } finally {
    await payload.delete({ collection: 'leads', where: { submitterOpenId: { equals: owner } } })
    for (const id of projectIds) await payload.delete({ collection: 'projects', id })
    if (mediaId) await payload.delete({ collection: 'media', id: mediaId })
    await payload.destroy()
  }
})
