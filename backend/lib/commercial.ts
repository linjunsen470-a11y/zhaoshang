import type { Where } from 'payload'
import options from '../collections/shared/commercialOptions.json'

export const PUBLIC_COMMERCIAL_STATUSES = ['online', 'coming', 'full']
export type CommercialRecord = Record<string, unknown>
export function commercialScene(doc: CommercialRecord): string {
  return typeof doc.businessScene === 'string' && doc.businessScene
    ? doc.businessScene : options.campusTypes.includes(String(doc.projectType)) ? 'campus' : ''
}
export function commercialId(value: unknown): string | number | undefined {
  if (typeof value === 'string' && value) return value
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return commercialId(value.id)
  return undefined
}
export function publicCommercialWhere(): Where {
  return { and: [
    { status: { in: PUBLIC_COMMERCIAL_STATUSES } },
    { or: [
      { parentProject: { exists: false } },
      { and: [
        { 'parentProject.listingKind': { equals: 'project' } },
        { 'parentProject.status': { in: PUBLIC_COMMERCIAL_STATUSES } },
      ] },
    ] },
  ] }
}
export function commercialIsPublic(doc: CommercialRecord): boolean {
  if (!PUBLIC_COMMERCIAL_STATUSES.includes(String(doc.status))) return false
  if (!commercialId(doc.parentProject)) return true
  const parent = doc.parentProject
  return Boolean(parent && typeof parent === 'object' && 'status' in parent
    && 'listingKind' in parent && parent.listingKind === 'project'
    && PUBLIC_COMMERCIAL_STATUSES.includes(String(parent.status)))
}
export function validateCommercial(doc: CommercialRecord): string | null {
  if (!['project', 'unit'].includes(String(doc.listingKind || 'unit'))) return '发布内容无效'
  if (doc.businessScene && !options.scenes.some(s => s.value === doc.businessScene)) return '商业场景无效'
  if (doc.listingKind === 'project' && (doc.opportunityType === 'transfer' || commercialId(doc.parentProject))) {
    return '整项目仅支持招商，且不能关联父项目'
  }
  for (const [min, max, label] of [['areaMin', 'areaMax', '面积'], ['monthlyRentMin', 'monthlyRentMax', '月租']]) {
    const lo = doc[min], hi = doc[max]
    const present = (v: unknown) => v !== null && v !== undefined && v !== ''
    if (present(lo) !== present(hi)) return `${label}上下限需同时填写或同时留空`
    if (!present(lo)) continue
    if (typeof lo !== 'number' || typeof hi !== 'number' || !Number.isFinite(lo) || !Number.isFinite(hi)
      || lo < 0 || hi < lo || (min === 'areaMin' && lo === 0)) return `${label}范围无效`
  }
  return null
}
export function commercialFilters(params: URLSearchParams): Where[] {
  const conditions: Where[] = []
  for (const [key, values] of Object.entries({ listingKind: options.kinds.map(v => v.value), businessScene: options.scenes.map(v => v.value), district: options.districts, status: ['draft', 'online', 'coming', 'full', 'offline'], opportunityType: ['leasing', 'transfer'], projectType: [...options.campusTypes, '其他', '店铺转让'] })) {
    const value = params.get(key)
    if (value && value !== '全部' && !values.includes(value)) throw new Error(`${key} 筛选无效`)
  }
  if (params.get('parentProject') && !/^[1-9]\d*$/.test(params.get('parentProject')!)) throw new Error('所属项目无效')
  for (const key of ['district', 'projectType', 'status', 'opportunityType', 'listingKind', 'parentProject']) {
    const value = params.get(key)
    if (value && value !== '全部') conditions.push({ [key]: { equals: value } })
  }
  const scene = params.get('businessScene')
  if (scene && scene !== '全部') conditions.push(scene === 'campus' ? { or: [
    { businessScene: { equals: scene } },
    { and: [{ businessScene: { exists: false } }, { projectType: { in: options.campusTypes } }] },
  ] } : { businessScene: { equals: scene } })
  if (params.get('business') && params.get('business') !== '全部') {
    if (!options.businesses.includes(params.get('business')!)) throw new Error('经营品类无效')
    conditions.push({ suitableBusiness: { in: [params.get('business')] } })
  }
  if (params.get('recommended') === 'true') conditions.push({ isRecommended: { equals: true } })
  if (params.has('ids')) conditions.push({ id: { in: (params.get('ids') || '').split(',').filter(Boolean).slice(0, 500) } })
  const q = params.get('q')?.trim().slice(0, 80)
  if (q) {
    const or: Where[] = ['title', 'schoolName', 'schoolAlias', 'venueName', 'addressText'].map(key => ({ [key]: { contains: q } }))
    const districts = options.districts.filter(value => value.includes(q))
    const businesses = options.businesses.filter(value => value.includes(q))
    if (districts.length) or.push({ district: { in: districts } })
    if (businesses.length) or.push({ suitableBusiness: { in: businesses } })
    conditions.push({ or })
  }
  for (const [param, ranges, lo, hi] of [
    ['area', options.areas, 'areaMin', 'areaMax'], ['rent', options.rents, 'monthlyRentMin', 'monthlyRentMax'],
  ] as const) {
    const value = params.get(param)
    if (!value || value === '全部') continue
    const range = ranges.find(item => item.value === value)
    if (!range) throw new Error(`${param} 筛选无效`)
    // Stored ranges are closed (min=max is a single unit); filters are [min,max).
    conditions.push({ [lo]: { exists: true } }, { [hi]: { greater_than_equal: range.min } })
    if (range.max !== null) conditions.push({ [lo]: { less_than: range.max } })
  }
  return conditions
}
export function pageNumber(value: string | null, fallback: number, maximum: number): number {
  const n = Number(value)
  return value && Number.isSafeInteger(n) && n > 0 ? Math.min(n, maximum) : fallback
}
