import type { Payload, Where } from 'payload'
import { publicCampusLabel, scrubSchoolText } from './publicSchool'

export function matchesPublicKeyword(doc: Record<string, unknown>, keyword: string) {
  const campus = doc.businessScene === 'campus'
  const visible = [doc.title, doc.addressText, campus ? '' : doc.venueName]
    .map(value => scrubSchoolText(String(value || ''), doc))
  visible.push(String(doc.district || ''), ...(campus ? [publicCampusLabel(doc.city, doc.district)] : []))
  if (Array.isArray(doc.suitableBusiness)) visible.push(...doc.suitableBusiness)
  const query = keyword.toLowerCase()
  return visible.some(value => value.toLowerCase().includes(query))
}

// Match redacted text before counting and keep only IDs for this page.
export async function publicProjectSearchPage(payload: Payload, conditions: Where[], keyword: string, sort: string[], page: number, limit: number) {
  const ids: (number | string)[] = []
  const start = (page - 1) * limit
  let totalDocs = 0
  for (let batch = 1; ; batch++) {
    const rows = await payload.find({
      collection: 'projects', where: { and: conditions }, page: batch, limit: 200, sort,
      select: { title: true, addressText: true, venueName: true, businessScene: true,
        schoolName: true, schoolAlias: true, city: true, district: true, suitableBusiness: true },
      depth: 0, overrideAccess: true,
    })
    for (const row of rows.docs) {
      if (!matchesPublicKeyword(row, keyword)) continue
      if (totalDocs >= start && ids.length < limit) ids.push(row.id)
      totalDocs++
    }
    if (!rows.hasNextPage) break
  }
  return { ids, pagination: { page, totalDocs, totalPages: Math.ceil(totalDocs / limit), hasNextPage: page * limit < totalDocs } }
}
