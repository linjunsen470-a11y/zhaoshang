import { commercialFilters, pageNumber, publicCommercialWhere } from '../../../../lib/commercial'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json, mapProject } from '../../_shared/payloadApi'

export async function GET(request: Request) {
  if (!await getAuthenticatedStaff('projects')) return json({ error: '请先登录后台' }, 401)
  const params = new URL(request.url).searchParams
  const payload = await getPayloadInstance()
  const result = await payload.find({
    collection: 'projects',
    where: { and: [publicCommercialWhere(), ...commercialFilters(new URLSearchParams({ q: params.get('q') || '' }))] },
    page: pageNumber(params.get('page'), 1, 100000),
    limit: 20,
    sort: ['-updatedAt', '-id'],
    depth: 1,
    select: { title: true, listingKind: true, businessScene: true, venueName: true, schoolName: true, schoolAlias: true, city: true, district: true, areaText: true, feeText: true, projectType: true, opportunityType: true, status: true, coverImage: true },
    overrideAccess: true,
  })
  return json({ docs: result.docs.map(doc => mapProject(doc, true)), totalPages: result.totalPages, totalDocs: result.totalDocs })
}
