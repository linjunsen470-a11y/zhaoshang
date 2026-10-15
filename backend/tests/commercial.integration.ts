import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import sharp from 'sharp'
import { commercialFilters, commercialIsPublic, publicCommercialWhere } from '../lib/commercial'

async function main() {
  if (!process.env.DATABASE_URI?.includes('/zhaoshang_commercial_test_20260922')) throw new Error('Only the isolated commercial test DB is allowed')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const suffix = Date.now()
  const prefix = `commercial-${suffix}`
  try {
    const data = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#334155' } }).png().toBuffer()
    const media = await payload.create({ collection: 'media', data: { source: 'seed_demo', alt: '商业场景测试图片' }, file: { data, mimetype: 'image/png', name: `${prefix}.png`, size: data.length }, overrideAccess: true })
    const base = { listingKind: 'unit', city: '广州', district: '天河', feeText: '测试费用，非真实房源', customerInfo: '测试客群', coverImage: media.id, images: [media.id], status: 'online' }
    const create = (extra: Record<string, unknown>) => payload.create({ collection: 'projects', data: { ...base, title: `${prefix}-${Math.random()}`, ...extra }, overrideAccess: true })
    const parent = await create({ title: `${prefix}-parent`, listingKind: 'project', businessScene: 'community' })
    const child = await create({ title: `${prefix}-child`, parentProject: parent.id, businessScene: 'community', areaMin: 50, areaMax: 50, monthlyRentMin: 5000, monthlyRentMax: 5000 })
    for (const scene of ['campus', 'tourism', 'mall']) await create({ businessScene: scene, listingKind: 'project' })
    await assert.rejects(() => create({ businessScene: 'mall', parentProject: parent.id }), /一致/)
    await assert.rejects(() => create({ businessScene: 'community', parentProject: child.id }), /整项目/)
    await assert.rejects(() => create({ businessScene: 'community', areaMin: 100, areaMax: 50 }), /范围/)
    await assert.rejects(() => create({ listingKind: 'project', businessScene: 'mall', opportunityType: 'transfer' }), /仅支持招商/)
    await assert.rejects(() => create({ businessScene: null }), /选择商业场景/)
    const draft = await create({ status: 'draft', businessScene: null })
    await assert.rejects(() => payload.update({ collection: 'projects', id: draft.id, data: { status: 'online' }, overrideAccess: true }), /选择商业场景/)
    await assert.rejects(() => payload.update({ collection: 'projects', id: parent.id, data: { district: '番禺' }, overrideAccess: true }), /存在所属铺位/)
    await assert.rejects(() => payload.delete({ collection: 'projects', id: parent.id, overrideAccess: true }), /存在所属铺位/)
    const find = (params: string) => payload.find({ collection: 'projects', where: { and: [publicCommercialWhere(), ...commercialFilters(new URLSearchParams(params))] }, limit: 20, depth: 1, overrideAccess: true })
    assert.equal((await find(`parentProject=${parent.id}&area=50to100&rent=5000to10000`)).totalDocs, 1)
    assert.equal((await find(`parentProject=${parent.id}&area=under50`)).totalDocs, 0)
    await payload.update({ collection: 'projects', id: parent.id, data: { status: 'offline' }, overrideAccess: true })
    assert.equal((await find(`parentProject=${parent.id}`)).totalDocs, 0)
    const hiddenChild = await payload.findByID({ collection: 'projects', id: child.id, depth: 1, overrideAccess: true })
    assert.equal(commercialIsPublic(hiddenChild), false)
    assert.equal(hiddenChild.status, 'online')
    const publicRead = await payload.find({ collection: 'projects', where: { id: { equals: child.id } }, overrideAccess: false, depth: 1 })
    assert.equal(publicRead.totalDocs, 0)
    await payload.update({ collection: 'projects', id: parent.id, data: { status: 'online' }, overrideAccess: true })
    assert.equal((await find(`parentProject=${parent.id}`)).totalDocs, 1)
    for (let i = 0; i < 105; i++) await create({ title: `${prefix}-paged-${String(i).padStart(3, '0')}`, businessScene: 'community', areaMin: i + 1, areaMax: i + 1 })
    const paged = await payload.find({ collection: 'projects', where: { and: [publicCommercialWhere(), ...commercialFilters(new URLSearchParams(`q=${prefix}-paged`))] }, page: 6, limit: 20, depth: 0, overrideAccess: true })
    assert.equal(paged.totalDocs, 105)
    assert.equal(paged.docs.length, 5)
    const filtered = await find(`q=${prefix}-paged&area=100to200`)
    assert.equal(filtered.totalDocs, 6)
    const lead = await payload.create({ collection: 'leads', data: { name: '测试商户', phone: '13812345678', businessScene: 'community', project: child.id, leadType: 'leasing', sourceChannel: 'mini_program', submitterOpenId: 'commercial-test-user' }, overrideAccess: true })
    const updated = await payload.update({ collection: 'leads', id: lead.id, data: { remark: '修改工作副本', customerSnapshot: { capturedAt: 'invalid' } }, overrideAccess: true })
    assert.deepEqual(updated.customerSnapshot, lead.customerSnapshot)
    console.log('PASS: database filtering/pagination, all scenes, parent visibility, relationship guards, new draft publication and immutable snapshots')
  } finally { await payload.destroy() }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1) })
