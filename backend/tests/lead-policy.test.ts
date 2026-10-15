import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MINI_PROGRAM_LEAD_TYPES,
  sanitizeLeadCreateInput,
  sanitizeLeadUpdateInput,
  validateLeadUserInput,
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

test('lead validation rejects blank names, fake booleans and invalid attachment identifiers', () => {
  assert.ok(validateLeadUserInput({ name: '   ' }))
  assert.ok(validateLeadUserInput({ name: ' '.repeat(500) + '客户' }))
  assert.ok(validateLeadUserInput({ hasCampusExperience: 'false' }))
  assert.ok(validateLeadUserInput({ equipmentDetails: { equipmentName: true } }))
  for (const id of [null, {}, '', 'bad', 0, -1, 1.5]) assert.ok(validateLeadUserInput({ attachments: [id] }))
  assert.equal(validateLeadUserInput({ attachments: [1, '2', { id: 3 }] }), null)
})
