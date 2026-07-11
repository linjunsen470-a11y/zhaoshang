import type { Where } from 'payload'
import {
  ALL,
  PUBLIC_STATUSES,
  getPayloadInstance,
  getProjectBudgetCategory,
  json,
  mapProject,
  sanitizeProjectInput,
} from '../_shared/payloadApi'
import { getAuthenticatedStaff } from '../_shared/auth'

export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const staff = await getAuthenticatedStaff('projects')
  const showPublicOnly = !staff || searchParams.get('public') === 'true'

  const andConditions: Where[] = []

  if (showPublicOnly) {
    andConditions.push({ status: { in: PUBLIC_STATUSES } })
  }

  const opportunityType = searchParams.get('opportunityType')
  if (opportunityType && opportunityType !== ALL) {
    andConditions.push({ opportunityType: { equals: opportunityType } })
  }

  const q = searchParams.get('q')?.toLowerCase().trim()
  if (q) {
    andConditions.push({
      or: [
        { title: { contains: q } },
        { schoolName: { contains: q } },
        { district: { contains: q } },
        { suitableBusiness: { contains: q } },
      ],
    })
  }

  for (const key of ['district', 'projectType', 'status'] as const) {
    const value = searchParams.get(key)
    if (value && value !== ALL) {
      andConditions.push({ [key]: { equals: value } } as Where)
    }
  }

  const business = searchParams.get('business')
  if (business && business !== ALL) {
    andConditions.push({ suitableBusiness: { contains: business } })
  }

  const result = await payload.find({
    collection: 'projects',
    where: andConditions.length > 0 ? { and: andConditions } : undefined,
    limit: 100,
    sort: '-sort',
    depth: 1,
    overrideAccess: true,
  })

  let projects = result.docs.map(doc => mapProject(doc, Boolean(staff)))

  const budget = searchParams.get('budget')
  if (budget && budget !== ALL) {
    projects = projects.filter(project => getProjectBudgetCategory(project) === budget)
  }

  projects.sort((a, b) => Number(b.sort || 0) - Number(a.sort || 0) || Number(b.createdAt) - Number(a.createdAt))
  return json(projects)
}

export async function POST(request: Request) {
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) {
    return json({ error: '权限不足，无法发布项目' }, 403)
  }

  let input: Record<string, unknown>
  try {
    input = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: '无效的 JSON 请求体' }, 400)
  }

  if (!input.title || !input.city || !input.district || !input.projectType) {
    return json({ error: '缺少必填字段' }, 400)
  }

  const payload = await getPayloadInstance()
  const doc = await payload.create({
    collection: 'projects',
    data: sanitizeProjectInput(input),
    overrideAccess: true,
  })

  return json(mapProject(doc, true), 201)
}

