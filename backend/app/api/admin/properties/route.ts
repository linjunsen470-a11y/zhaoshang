import type { Where } from 'payload'
import { getProjectMissingFields, PUBLIC_PROJECT_STATUSES } from '../../../../collections/Projects'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json, mapProject } from '../../_shared/payloadApi'

const FILTER_KEYS = ['status', 'opportunityType', 'district', 'projectType'] as const
const QUICK_FIELDS = ['title', 'district', 'areaText', 'feeText', 'status', 'isRecommended', 'sort'] as const
const SORTS = new Set(['-updatedAt', 'updatedAt', '-sort', 'sort', 'title', '-title'])

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), max) : fallback
}

function pickQuickData(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const key of QUICK_FIELDS) {
    if (input[key] !== undefined) result[key] = input[key]
  }
  if (result.sort !== undefined) result.sort = Number(result.sort) || 0
  if (result.isRecommended !== undefined) result.isRecommended = Boolean(result.isRecommended)
  return result
}

export async function GET(request: Request) {
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) return json({ error: '请先登录后台' }, 401)

  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const where: Where[] = []
  const q = searchParams.get('q')?.trim().slice(0, 80)

  if (q) {
    where.push({
      or: [
        { title: { contains: q } },
        { schoolName: { contains: q } },
        { schoolAlias: { contains: q } },
        { addressText: { contains: q } },
      ],
    })
  }

  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key)
    if (value) where.push({ [key]: { equals: value } } as Where)
  }

  const page = positiveInt(searchParams.get('page'), 1, 100000)
  const limit = positiveInt(searchParams.get('limit'), 25, 100)
  const requestedSort = searchParams.get('sort') || '-updatedAt'
  const sort = SORTS.has(requestedSort) ? requestedSort : '-updatedAt'

  const result = await payload.find({
    collection: 'projects',
    where: where.length ? { and: where } : undefined,
    page,
    limit,
    sort,
    depth: 1,
    overrideAccess: true,
  })

  return json({
    docs: result.docs.map(doc => ({
      ...mapProject(doc, true),
      missingFields: getProjectMissingFields(doc as unknown as Record<string, unknown>),
    })),
    page: result.page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  })
}

export async function PATCH(request: Request) {
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) return json({ error: '请先登录后台' }, 401)

  let body: { ids?: unknown; data?: unknown }
  try {
    body = await request.json() as { ids?: unknown; data?: unknown }
  } catch {
    return json({ error: '请求内容不是有效的 JSON' }, 400)
  }

  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String).filter(Boolean))].slice(0, 100) : []
  const data = body.data && typeof body.data === 'object' ? pickQuickData(body.data as Record<string, unknown>) : {}
  if (!ids.length || !Object.keys(data).length) return json({ error: '请选择房源并填写需要修改的内容' }, 400)

  const payload = await getPayloadInstance()
  const currentDocs = await Promise.all(ids.map(id => payload.findByID({ collection: 'projects', id, depth: 0, overrideAccess: true })))

  const invalid = currentDocs.map(doc => {
    const merged = { ...(doc as unknown as Record<string, unknown>), ...data }
    const publicStatus = PUBLIC_PROJECT_STATUSES.includes(merged.status as (typeof PUBLIC_PROJECT_STATUSES)[number])
    return publicStatus ? { id: String(doc.id), title: String(doc.title || ''), missing: getProjectMissingFields(merged) } : null
  }).filter(item => item?.missing.length)

  if (invalid.length) {
    return json({ error: '部分房源资料不完整，暂不能上架', invalid }, 409)
  }

  try {
    const updated = await Promise.all(ids.map(id => payload.update({
      collection: 'projects',
      id,
      data,
      depth: 1,
      overrideAccess: true,
    })))
    return json({ docs: updated.map(doc => mapProject(doc, true)) })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '房源更新失败，请重试' }, 400)
  }
}
