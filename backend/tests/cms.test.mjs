import assert from 'node:assert/strict'
import test from 'node:test'
import { getProjectMissingFields, projectQualityWhere, REQUIRED_PROJECT_FIELDS } from '../lib/cmsRules.mjs'

test('property publish checklist reports only missing public fields', () => {
  assert.deepEqual(getProjectMissingFields({
    title: '一号房源',
    coverImage: 1,
    projectType: '食堂档口',
    businessScene: 'campus',
    district: '天河',
    feeText: '3 万元/年',
    customerInfo: '',
    images: [],
  }), ['客群说明', '详情图片'])
})


// Evaluate the supported Payload predicates against fixtures to check that the
// database filter and the publication/editor rule agree, including missing fields.
function matches(doc, where) {
  if (where.and) return where.and.every(condition => matches(doc, condition))
  if (where.or) return where.or.some(condition => matches(doc, condition))
  return Object.entries(where).every(([key, operators]) => Object.entries(operators).every(([op, expected]) => {
    const value = doc[key]
    if (op === 'exists') return (value != null && (!Array.isArray(value) || value.length > 0)) === expected
    if (op === 'equals') return value === expected
    if (op === 'not_equals') return value !== expected
    throw new Error(`Unsupported predicate: ${op}`)
  }))
}

test('completeness filters agree with publication checks for every missing field and missing scene', () => {
  const ready = { title: '测试铺位', coverImage: 1, district: '天河', feeText: '面议', customerInfo: '社区居民', images: [1], listingKind: 'unit', businessScene: 'campus' }
  const cases = [ready, ...REQUIRED_PROJECT_FIELDS.flatMap(({ key }) => [
    { ...ready, [key]: undefined }, { ...ready, [key]: key === 'images' ? [] : null },
    ...(['title', 'feeText', 'customerInfo'].includes(key) ? [{ ...ready, [key]: '' }] : []),
  ]), { ...ready, businessScene: undefined },
  { ...ready, businessScene: null },
  { ...ready, businessScene: undefined, listingKind: undefined }]
  for (const record of cases) {
    const complete = getProjectMissingFields(record).length === 0
    assert.equal(matches(record, projectQualityWhere('ready')), complete)
    assert.equal(matches(record, projectQualityWhere('blocked')), !complete)
  }
})

test('filtering before pagination includes matching records beyond the first unfiltered page', () => {
  const records = Array.from({ length: 40 }, (_, index) => ({ id: index + 1, businessScene: 'campus', title: '铺位', coverImage: 1, district: '天河', feeText: '面议', customerInfo: index < 30 ? '' : '居民', images: [1] }))
  const filtered = records.filter(record => matches(record, projectQualityWhere('ready')))
  assert.equal(filtered.length, 10)
  assert.deepEqual(filtered.slice(0, 5).map(record => record.id), [31, 32, 33, 34, 35])
})
