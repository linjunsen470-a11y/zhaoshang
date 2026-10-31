export const REQUIRED_PROJECT_FIELDS = [
  { key: 'title', label: '项目/铺位标题' },
  { key: 'coverImage', label: '封面图' },
  { key: 'district', label: '区域' },
  { key: 'feeText', label: '费用说明' },
  { key: 'customerInfo', label: '客群说明' },
  { key: 'images', label: '详情图片' },
]

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

export function getProjectMissingFields(data) {
  const missing = REQUIRED_PROJECT_FIELDS.filter(field => !hasValue(data[field.key])).map(field => field.label)
  if (!data.businessScene) missing.push('商业场景')
  return missing
}

/** Match completeness in the database before counting and paginating. */
export function projectQualityWhere(quality) {
  // Select fields are PostgreSQL enums: an empty string is not a valid enum
  // operand. Unset selections persist as null and only need an existence check.
  const textFields = new Set(['title', 'feeText', 'customerInfo'])
  const present = key => ({ [key]: { exists: true, ...(textFields.has(key) ? { not_equals: '' } : {}) } })
  const absent = key => textFields.has(key)
    ? { or: [{ [key]: { exists: false } }, { [key]: { equals: '' } }] }
    : { [key]: { exists: false } }
  const scenePresent = { businessScene: { exists: true } }
  if (quality === 'ready') {
    return { and: [...REQUIRED_PROJECT_FIELDS.map(field => present(field.key)), scenePresent] }
  }
  if (quality === 'blocked') {
    return { or: [...REQUIRED_PROJECT_FIELDS.map(field => absent(field.key)), { businessScene: { exists: false } }] }
  }
  return null
}
