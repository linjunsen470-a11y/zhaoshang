import assert from 'node:assert/strict'
import test from 'node:test'
import { commercialFilters, commercialIsPublic, commercialScene, validateCommercial } from '../lib/commercial'
import { publicCampusLabel, redactPublicProject, scrubSchoolText } from '../lib/publicSchool'
import { buildShareMaterial } from '../lib/shareMaterials'
import { sanitizeLeadUpdateInput, validateLeadUserInput } from '../app/api/_shared/leadPolicy'
import { buildLeadSnapshot } from '../lib/leadSnapshot'

test('public copy names only the city and district school', () => {
  assert.equal(publicCampusLabel('广州', '白云'), '广州白云某学校')
  assert.equal(scrubSchoolText('广州白云学院食堂，靠近白云学院', { schoolName: '广州白云学院', schoolAlias: '白云学院', city: '广州', district: '白云' }), '广州白云某学校食堂，靠近广州白云某学校')
  const material = buildShareMaterial({ id: 1, title: '广州白云学院档口', schoolName: '广州白云学院', schoolAlias: '白云学院', city: '广州', district: '白云', businessScene: 'campus', feeText: '面议' })
  assert.equal(material.placeLabel, '广州白云某学校')
  assert.equal(material.copyText.includes('白云学院'), false)
  assert.equal(material.headline, '广州白云某学校档口')
})
test('scene classification requires an explicit scene', () => {
  assert.equal(commercialScene({ projectType: '校园商业街' }), '')
  assert.equal(commercialScene({ projectType: '店铺转让' }), '')
  assert.equal(commercialScene({ projectType: '其他' }), '')
})

test('public scope excludes retired properties, their children and outside-campus units', () => {
  for (const businessScene of ['mall', 'community', 'tourism']) {
    assert.equal(commercialIsPublic({ businessScene, status: 'online' }), false)
    assert.equal(commercialIsPublic({ businessScene: 'office', status: 'online', parentProject: { id: 1, listingKind: 'project', businessScene, status: 'online' } }), false)
    assert.ok(validateCommercial({ businessScene, status: 'online' }))
    assert.ok(validateCommercial({ businessScene, status: 'offline' }))
    assert.throws(() => commercialFilters(new URLSearchParams({ businessScene })))
    assert.ok(validateLeadUserInput({ businessScene }))
  }
  assert.equal(commercialIsPublic({ businessScene: 'campus', projectType: '校外临校铺位', status: 'online' }), false)
  assert.deepEqual(commercialFilters(new URLSearchParams('available=true')), [{ status: { in: ['online', 'coming'] } }])
})

test('public project redaction covers nested copy without changing the staff original', () => {
  const original = {
    id: '42', title: '白云学院档口', schoolName: '广州白云学院', schoolAlias: '白云学院',
    city: '广州', district: '白云', showFullSchoolName: true,
    highlights: ['广州白云学院食堂'],
    transferInfo: { currentBusiness: '白云学院咖啡', includesEquipment: true },
  }
  const before = structuredClone(original)
  const result = redactPublicProject(original, original)
  assert.equal(result.title, '广州白云某学校档口')
  assert.deepEqual(result.highlights, ['广州白云某学校食堂'])
  assert.deepEqual(result.transferInfo, { currentBusiness: '广州白云某学校咖啡', includesEquipment: true })
  assert.equal(result.schoolName, '')
  assert.equal(result.schoolAlias, '')
  assert.equal(result.showFullSchoolName, false)
  assert.equal(result.id, '42')
  assert.deepEqual(original, before)
})
test('range validation accepts exact values and rejects incomplete or inverted values', () => {
  assert.equal(validateCommercial({ areaMin: 50, areaMax: 50 }), null)
  assert.equal(validateCommercial({ monthlyRentMin: 0, monthlyRentMax: 0 }), null)
  for (const doc of [{ areaMin: 50 }, { areaMin: 100, areaMax: 50 }, { areaMin: 0, areaMax: 1 }, { monthlyRentMin: '5000', monthlyRentMax: 6000 }, { areaMin: NaN, areaMax: 10 }]) assert.ok(validateCommercial(doc))
})
test('project relationships and publication remain independent', () => {
  assert.ok(validateCommercial({ listingKind: 'project', parentProject: 1 }))
  assert.ok(validateCommercial({ listingKind: 'project', opportunityType: 'transfer' }))
  assert.equal(commercialIsPublic({ businessScene: 'office', status: 'online', parentProject: { id: 1, businessScene: 'office', listingKind: 'project', status: 'offline' } }), false)
  assert.equal(commercialIsPublic({ businessScene: 'office', status: 'online', parentProject: 1 }), false)
  assert.equal(commercialIsPublic({ businessScene: 'office', status: 'online', parentProject: { id: 1, businessScene: 'office', listingKind: 'project', status: 'full' } }), true)
})
test('database filters use numeric ranges before pagination; no text amount guessing', () => {
  const filters = commercialFilters(new URLSearchParams('area=50to100&rent=5000to10000&businessScene=office'))
  assert.ok(filters.some(f => JSON.stringify(f) === JSON.stringify({ areaMin: { less_than: 100 } })))
  assert.ok(filters.some(f => JSON.stringify(f) === JSON.stringify({ areaMax: { greater_than_equal: 50 } })))
  assert.ok(filters.some(f => JSON.stringify(f) === JSON.stringify({ monthlyRentMin: { less_than: 10000 } })))
  assert.equal(JSON.stringify(filters).includes('feeText'), false)
  assert.throws(() => commercialFilters(new URLSearchParams('rent=invalid')))
})

test('browse group database filters preserve precise scenes as an intersection and require explicit campus scenes', () => {
  assert.deepEqual(commercialFilters(new URLSearchParams('sceneGroup=workplace&businessScene=office')), [
    { businessScene: { in: ['industrial_park', 'office'] } }, { businessScene: { equals: 'office' } },
  ])
  const campus = JSON.stringify(commercialFilters(new URLSearchParams('sceneGroup=campus')))
  assert.equal(campus.includes('exists'), false)
  assert.equal(campus.includes('projectType'), false)
  assert.throws(() => commercialFilters(new URLSearchParams('sceneGroup=unknown')), /sceneGroup/)
})
test('lead edits retain original project and scene, including unsolicited project changes', () => {
  const updated = sanitizeLeadUpdateInput({ projectId: 999, businessScene: 'mall', customerSnapshot: {} }, 'owner', { project: 42, businessScene: 'community', leadType: 'leasing' })
  assert.equal(updated.project, 42)
  assert.equal(updated.businessScene, 'community')
  const general = sanitizeLeadUpdateInput({ projectId: 999, businessScene: 'tourism' }, 'owner', {})
  assert.equal(general.project, undefined)
  assert.equal(general.businessScene, 'tourism')
  assert.equal(buildLeadSnapshot({ businessScene: 'mall' }).businessScene, 'mall')
  assert.ok(validateLeadUserInput({ businessScene: 'invalid' }))
})
