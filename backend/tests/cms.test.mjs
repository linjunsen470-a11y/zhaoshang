import assert from 'node:assert/strict'
import test from 'node:test'
import { getProjectMissingFields, simplifyInquiryStatus } from '../lib/cmsRules.mjs'

test('property publish checklist reports only missing public fields', () => {
  assert.deepEqual(getProjectMissingFields({
    title: '一号房源',
    coverImage: 1,
    projectType: '食堂档口',
    district: '天河',
    feeText: '3 万元/年',
    customerInfo: '',
    images: [],
  }), ['客群说明', '详情图片'])
})

test('legacy inquiry statuses collapse into three practical states', () => {
  assert.equal(simplifyInquiryStatus('new'), 'new')
  assert.equal(simplifyInquiryStatus('negotiating'), 'contacted')
  assert.equal(simplifyInquiryStatus('invalid'), 'closed')
})
