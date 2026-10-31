export const SOURCE_FIELDS = ['title', 'listingKind', 'businessScene', 'opportunityType', 'city', 'district', 'schoolName', 'schoolAlias', 'venueName', 'projectType', 'unitLocation', 'addressText', 'areaText', 'areaMin', 'areaMax', 'monthlyRentMin', 'monthlyRentMax', 'feeText', 'suitableBusiness', 'status', 'customerInfo', 'operatingRequirements', 'cooperationMode', 'coverImage', 'images', 'sourceRemark', 'sourcePropertyType', 'sourceBusinessText']
export const META_FIELDS = ['seedKey', 'tencentSync']
export function isTencentSource(doc: Record<string, unknown> | undefined) {
  return typeof doc?.seedKey === 'string' && doc.seedKey.startsWith('tencent:')
}
export function sameValue(a: unknown, b: unknown): boolean {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object' && 'id' in value) return String(value.id)
    return value === undefined ? null : value
  }
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}
export function assertSourceWrite(data: Record<string, unknown>, original: Record<string, unknown> | undefined, trusted: boolean) {
  if (trusted) return
  for (const key of META_FIELDS) {
    if (key === 'seedKey' && !isTencentSource(original) && !isTencentSource(data)) continue
    if (key in data && !sameValue(data[key], original?.[key])) throw new Error('来源标识与同步状态只能由同步服务修改')
  }
  if (!isTencentSource(original)) return
  for (const key of SOURCE_FIELDS) {
    if (key in data && !sameValue(data[key], original?.[key])) throw new Error(`腾讯文档是资料主源，请在文档修改：${key}`)
  }
}

export type PropertySyncMeta = { scope?: string; firstMissingAt?: string | null; lastSeenAt?: string; removed?: boolean; reason?: string; sourceHash?: string }
export function nextMissing(meta: PropertySyncMeta, scope: string, now: string): PropertySyncMeta {
  if (meta.scope !== scope || !meta.firstMissingAt) return { ...meta, scope, firstMissingAt: now, removed: false }
  return { ...meta, removed: Date.parse(now) - Date.parse(meta.firstMissingAt) >= 15 * 60_000 }
}
