type SchoolSource = {
  [key: string]: unknown
  schoolName?: unknown
  schoolAlias?: unknown
  city?: unknown
  district?: unknown
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function publicCampusLabel(city: unknown, district: unknown) {
  const place = `${text(city)}${text(district)}`
  return place ? `${place}某学校` : '某学校'
}

export function schoolNames(source: SchoolSource) {
  return [source.schoolName, source.schoolAlias]
    .map(text)
    .filter(name => name.length >= 2)
    .sort((left, right) => right.length - left.length)
}

export function scrubSchoolText(value: string, source: SchoolSource) {
  const label = publicCampusLabel(source.city, source.district)
  return schoolNames(source).reduce((current, name) => current.split(name).join(label), value)
}

const TEXT_FIELDS = [
  'title', 'addressText', 'customerInfo', 'introduction', 'operatingRequirements',
  'venueName', 'unitLocation',
  'premisesConditions', 'cooperationMode', 'viewingTimeText', 'feeText', 'areaText',
]

export function redactPublicProject<T extends Record<string, unknown>>(project: T, source: SchoolSource): T {
  const next: Record<string, unknown> = { ...project }
  for (const key of TEXT_FIELDS) {
    if (typeof next[key] === 'string') next[key] = scrubSchoolText(next[key], source)
  }
  if (Array.isArray(next.highlights)) {
    next.highlights = next.highlights.map(item => typeof item === 'string' ? scrubSchoolText(item, source) : item)
  }
  if (next.transferInfo && typeof next.transferInfo === 'object') {
    const info = { ...(next.transferInfo as Record<string, unknown>) }
    for (const key of Object.keys(info)) {
      if (typeof info[key] === 'string') info[key] = scrubSchoolText(info[key], source)
    }
    next.transferInfo = info
  }
  next.schoolName = ''
  next.schoolAlias = ''
  next.showFullSchoolName = false
  return next as T
}
