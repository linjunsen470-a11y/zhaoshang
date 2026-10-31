import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MINI_PROGRAM_LEAD_TYPES,
  sanitizeLeadCreateInput,
  sanitizeLeadUpdateInput,
  validateLeadUserInput,
  validateLeadCreateRequirements,
} from '../app/api/_shared/leadPolicy'

test('create sanitization forces ownership and removes CRM-only fields', () => {
  const result = sanitizeLeadCreateInput({
    leadType: 'leasing',
    sourceChannel: 'mini_program',
    name: '测试用户',
    phone: '13812345678',
    status: 'closed',
    assignedTo: 99,
    customerSnapshot: { phone: 'bad' },
  }, 'openid-a')

  assert.equal(result.submitterOpenId, 'openid-a')
  assert.equal(result.status, 'new')
  assert.equal('assignedTo' in result, false)
  assert.equal('customerSnapshot' in result, false)
})

test('update preserves stable type/channel and accepts only user fields', () => {
  for (const leadType of MINI_PROGRAM_LEAD_TYPES) {
    const result = sanitizeLeadUpdateInput({
      leadType: 'leasing',
      sourceChannel: 'admin',
      phone: '13912345678',
      status: 'closed',
    }, 'openid-a', { leadType, sourceChannel: 'mini_program' })
    assert.equal(result.leadType, leadType)
    assert.equal(result.sourceChannel, 'mini_program')
    assert.equal('status' in result, false)
  }
})

test('lead validation covers phone, attachments and nested field limits', () => {
  assert.equal(validateLeadUserInput({ phone: '12812345678' }), '手机号格式不正确')
  assert.equal(validateLeadUserInput({ attachments: Array(7).fill(1) }), '最多上传 6 张图片')
  assert.equal(validateLeadUserInput({ equipmentDetails: { specText: 'x'.repeat(101) } }), 'equipmentDetails.specText 内容过长')
  assert.equal(validateLeadUserInput({ phone: '13812345678', attachments: [] }), null)
})

test('partial updates preserve omitted experience and scene; nested CRM fields are discarded', () => {
  const result = sanitizeLeadUpdateInput({ remark: '补充', transferDetails: { locationText: '广州', internalNote: '注入' } }, 'openid-a', { leadType: 'transfer' })
  assert.equal(result.hasCampusExperience, undefined)
  assert.equal(result.businessScene, undefined)
  assert.deepEqual(result.transferDetails, { locationText: '广州' })
  assert.equal(sanitizeLeadCreateInput({ sourceChannel: 'admin' }, 'openid-a').sourceChannel, 'mini_program')
})

test('lead validation accepts omitted names and rejects fake booleans and invalid attachment identifiers', () => {
  assert.equal(validateLeadUserInput({ name: '   ' }), null)
  assert.equal(validateLeadUserInput({ phone: '13812345678' }), null)
  assert.ok(validateLeadUserInput({ name: ' '.repeat(500) + '客户' }))
  assert.ok(validateLeadUserInput({ hasCampusExperience: 'false' }))
  assert.ok(validateLeadUserInput({ equipmentDetails: { equipmentName: true } }))
  for (const id of [null, {}, '', 'bad', 0, -1, 1.5]) assert.ok(validateLeadUserInput({ attachments: [id] }))
  assert.equal(validateLeadUserInput({ attachments: [1, '2', { id: 3 }] }), null)
})

test('unnamed leads keep unasked fields unknown and partial edits preserve nested details', () => {
  const created = sanitizeLeadCreateInput({ name: '  ', phone: '13812345678', transferDetails: { locationText: '广州' } }, 'owner')
  assert.equal(created.name, null)
  assert.equal(created.hasCampusExperience, null)
  assert.equal(created.transferDetails?.includesEquipment, null)
  const edited = sanitizeLeadUpdateInput({ transferDetails: { locationText: '深圳' } }, 'owner', {
    leadType: 'transfer', transferDetails: { locationText: '广州', transferFee: '5万', includesEquipment: true },
  })
  assert.deepEqual(edited.transferDetails, { locationText: '深圳', transferFee: '5万', includesEquipment: true })
})


test('only transfer location and equipment name are required by their respective consultation types', () => {
  assert.equal(validateLeadCreateRequirements({ leadType: 'leasing' }), null)
  assert.equal(validateLeadCreateRequirements({ leadType: 'renovation_consult' }), null)
  assert.ok(validateLeadCreateRequirements({ leadType: 'transfer' }))
  assert.equal(validateLeadCreateRequirements({ leadType: 'transfer', transferDetails: { locationText: '广州' } }), null)
  for (const leadType of ['equipment_sell', 'equipment_buy', 'equipment_recycle']) {
    assert.ok(validateLeadCreateRequirements({ leadType }))
    assert.equal(validateLeadCreateRequirements({ leadType, equipmentDetails: { equipmentName: '冷柜' } }), null)
  }
})

test('editing public equipment content requires review but private and unchanged edits do not', () => {
  const existing = {
    leadType: 'equipment_sell', businessType: '冷柜', budgetRange: '2000元', regionPreference: '广州',
    equipmentDetails: { equipmentName: '冷柜', specText: '双门', expectedPrice: null },
    attachments: [{ id: 7 }], equipmentPublication: { status: 'online', publicRemark: '员工确认的说明' },
  }
  for (const patch of [
    { businessType: '烤箱' }, { budgetRange: '3000元' }, { regionPreference: '深圳' },
    { equipmentDetails: { specText: '单门' } }, { attachments: [8] }, { attachments: [] },
  ]) {
    const result = sanitizeLeadUpdateInput(patch, 'owner', existing)
    assert.deepEqual(result.equipmentPublication, { status: 'draft', publicRemark: '员工确认的说明' })
    assert.equal('customerSnapshot' in result, false)
  }
  for (const patch of [
    { phone: '13912345678', remark: '私密补充' }, { businessType: '冷柜' },
    { equipmentDetails: { specText: '双门', expectedPrice: '' } }, { attachments: ['7'] },
    { equipmentPublication: { status: 'online', publicRemark: '客户注入' } },
  ]) {
    assert.equal('equipmentPublication' in sanitizeLeadUpdateInput(patch, 'owner', existing), false)
  }
  assert.equal('equipmentPublication' in sanitizeLeadUpdateInput({ businessType: '烤箱' }, 'owner', {
    ...existing, equipmentPublication: { status: 'offline' },
  }), false)
})
