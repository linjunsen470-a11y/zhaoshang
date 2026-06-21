import {
  ALL,
  PUBLIC_STATUSES,
  getPayloadInstance,
  getProjectBudgetCategory,
  json,
  mapProject,
  sanitizeProjectInput,
} from '../_shared/payloadApi'

export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const result = await payload.find({
    collection: 'projects',
    limit: 100,
    sort: '-sort',
    depth: 1,
    overrideAccess: true,
  })

  let projects = result.docs.map(doc => mapProject(doc))

  if (searchParams.get('public') === 'true') {
    projects = projects.filter(project =>
      PUBLIC_STATUSES.includes(String(project.status)) && project.auditStatus !== 'rejected',
    )
  }

  const opportunityType = searchParams.get('opportunityType')
  if (opportunityType && opportunityType !== ALL) {
    projects = projects.filter(project => project.opportunityType === opportunityType)
  }

  const q = searchParams.get('q')?.toLowerCase().trim()
  if (q) {
    projects = projects.filter(project =>
      String(project.title).toLowerCase().includes(q) ||
      String(project.schoolName).toLowerCase().includes(q) ||
      String(project.district).toLowerCase().includes(q) ||
      project.suitableBusiness.some(item => item.toLowerCase().includes(q)),
    )
  }

  for (const key of ['district', 'projectType', 'status'] as const) {
    const value = searchParams.get(key)
    if (value && value !== ALL) {
      projects = projects.filter(project => String(project[key]) === value)
    }
  }

  const budget = searchParams.get('budget')
  if (budget && budget !== ALL) {
    projects = projects.filter(project => getProjectBudgetCategory(project) === budget)
  }

  const business = searchParams.get('business')
  if (business && business !== ALL) {
    projects = projects.filter(project => project.suitableBusiness.includes(business))
  }

  projects.sort((a, b) => Number(b.sort || 0) - Number(a.sort || 0) || Number(b.createdAt) - Number(a.createdAt))
  return json(projects)
}

export async function POST(request: Request) {
  const input = await request.json() as Record<string, unknown>
  if (!input.title || !input.city || !input.district || !input.projectType) {
    return json({ error: '缺少必填字段' }, 400)
  }

  const payload = await getPayloadInstance()
  const doc = await payload.create({
    collection: 'projects',
    data: sanitizeProjectInput(input),
    overrideAccess: true,
  })

  return json(mapProject(doc), 201)
}
