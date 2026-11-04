import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getPayload } from 'payload'
import { signAuthToken } from '../app/api/_shared/tokens'
import { GET } from '../app/api/favorites/route'
import { PUT, DELETE } from '../app/api/favorites/[id]/route'

const uri = new URL(process.env.DATABASE_URI || 'http://unset')
if (process.env.FAVORITES_TEST_CONFIRM_ISOLATED !== 'true' || uri.hostname !== '127.0.0.1' || uri.pathname !== '/favorites_isolated_test') {
  throw new Error('Favorites database tests require explicit confirmation and an isolated localhost /favorites_isolated_test database')
}

test('favorite API isolates owners, is idempotent and retains unavailable project IDs', { timeout: 120_000 }, async () => {
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const prefix = `favorites-test-${randomUUID()}`
  const ownerA = `${prefix}-a`
  const ownerB = `${prefix}-b`
  const ownerC = `${prefix}-c`
  const tokenA = signAuthToken(ownerA)
  const tokenB = signAuthToken(ownerB)
  const tokenC = signAuthToken(ownerC)
  const projects: (string | number)[] = []
  const users: (string | number)[] = []
  let mediaId: string | number | undefined
  const request = (method: string, token?: string) => new Request('http://localhost/api/favorites', { method, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const args = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) })
  const list = async (token: string) => (await GET(request('GET', token))).json() as Promise<{ docs: { projectId: string }[] }>
  try {
    const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#334155' } }).png().toBuffer()
    const media = await payload.create({ collection: 'media', data: { source: 'seed_demo', alt: '隔离测试图片' }, file: { data: image, mimetype: 'image/png', name: `${prefix}.png`, size: image.length }, overrideAccess: true })
    mediaId = media.id
    const base = { title: prefix, listingKind: 'unit' as const, businessScene: 'office' as const, city: '广州', district: '天河', feeText: '测试费用', customerInfo: '测试客群', coverImage: media.id, images: [media.id] }
    const project = await payload.create({ collection: 'projects', data: { ...base, status: 'online' }, overrideAccess: true })
    projects.push(project.id)
    const draft = await payload.create({ collection: 'projects', data: { ...base, title: `${prefix}-draft`, status: 'draft' }, overrideAccess: true })
    projects.push(draft.id)

    assert.equal((await GET(request('GET'))).status, 401)
    assert.equal((await PUT(request('PUT'), args(project.id))).status, 401)
    assert.equal((await PUT(request('PUT', tokenA), args('bad-id'))).status, 400)
    assert.equal((await PUT(request('PUT', tokenA), args(draft.id))).status, 404)
    const concurrent = await Promise.all([PUT(request('PUT', tokenA), args(project.id)), PUT(request('PUT', tokenA), args(project.id))])
    assert.deepEqual(concurrent.map(response => response.status), [200, 200])
    assert.equal((await list(tokenB)).docs.length, 0)
    assert.equal((await DELETE(request('DELETE', tokenB), args(project.id))).status, 200)
    assert.equal((await list(tokenA)).docs.length, 1)
    assert.equal((await PUT(request('PUT', tokenB), args(project.id))).status, 200)
    const own = await list(tokenA)
    assert.deepEqual(own.docs.map(row => row.projectId), [String(project.id)])
    assert.equal('ownerOpenId' in own.docs[0], false)
    const count = await payload.count({ collection: 'favorites', where: { projectId: { equals: String(project.id) } }, overrideAccess: true })
    assert.equal(count.totalDocs, 2)
    const editor = await payload.create({ collection: 'users', data: { email: `${prefix}-editor@example.invalid`, password: randomUUID(), role: 'editor' }, overrideAccess: true })
    const admin = await payload.create({ collection: 'users', data: { email: `${prefix}-admin@example.invalid`, password: randomUUID(), role: 'admin' }, overrideAccess: true })
    users.push(editor.id, admin.id)
    await assert.rejects(() => payload.find({ collection: 'favorites', overrideAccess: false }))
    await assert.rejects(() => payload.find({ collection: 'favorites', user: editor, overrideAccess: false }))
    const adminRows = await payload.find({ collection: 'favorites', user: admin, where: { projectId: { equals: String(project.id) } }, overrideAccess: false })
    assert.equal(adminRows.totalDocs, 2)
    const pool = (payload.db as unknown as { pool: { query: (sql: string, values: string[]) => Promise<{ rows: { project_id: string; favorite_count: string }[] }> } }).pool
    const report = await pool.query('SELECT project_id, COUNT(*) AS favorite_count FROM favorites GROUP BY project_id HAVING project_id = $1', [String(project.id)])
    assert.equal(Number(report.rows[0].favorite_count), 2)
    assert.equal((await GET(request('GET', tokenA))).headers.get('Cache-Control'), 'private, no-store')
    await assert.rejects(() => payload.create({ collection: 'favorites', data: { ownerOpenId: ownerA, projectId: String(project.id) }, overrideAccess: true }))

    await payload.update({ collection: 'projects', id: project.id, data: { status: 'offline' }, overrideAccess: true })
    assert.equal((await PUT(request('PUT', tokenC), args(project.id))).status, 404)
    assert.deepEqual((await list(tokenA)).docs.map(row => row.projectId), [String(project.id)])
    await payload.delete({ collection: 'projects', id: project.id, overrideAccess: true })
    projects.splice(projects.indexOf(project.id), 1)
    assert.deepEqual((await list(tokenB)).docs.map(row => row.projectId), [String(project.id)])
    assert.equal((await DELETE(request('DELETE', tokenB), args(project.id))).status, 200)
    assert.equal((await DELETE(request('DELETE', tokenB), args(project.id))).status, 200)
    assert.equal((await list(tokenB)).docs.length, 0)
    assert.equal((await list(tokenA)).docs.length, 1)
  } finally {
    await payload.delete({ collection: 'favorites', where: { ownerOpenId: { in: [ownerA, ownerB, ownerC] } }, overrideAccess: true })
    for (const id of projects) await payload.delete({ collection: 'projects', id, overrideAccess: true })
    if (mediaId) await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true })
    for (const id of users) await payload.delete({ collection: 'users', id, overrideAccess: true })
    await payload.destroy()
  }
})
