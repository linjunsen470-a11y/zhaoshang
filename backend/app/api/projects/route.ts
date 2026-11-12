import { publicProjectSearchPage } from '../../../lib/publicProjectSearch'
import { commercialFilters, pageNumber, publicCommercialWhere } from '../../../lib/commercial'
import {
  getPayloadInstance,
  json,
  mapProject,
  sanitizeProjectInput,
} from '../_shared/payloadApi'
import { getAuthenticatedStaff } from '../_shared/auth'
import { readJsonObject, jsonInputError, sameOrigin } from '../_shared/requestInput'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const { q, ...params } = Object.fromEntries(searchParams)
  let conditions
  try {
    conditions = commercialFilters(new URLSearchParams(params))
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '筛选无效' }, 400)
  }

  try {
    const payload = await getPayloadInstance()
    const staff = await getAuthenticatedStaff('projects')
    const showPublicOnly = !staff || searchParams.get('public') === 'true'
    if (showPublicOnly) conditions.push(publicCommercialWhere())
    const page = pageNumber(searchParams.get('page'), 1, 100000)
    const limit = pageNumber(searchParams.get('limit'), 20, 100)
    const sort = searchParams.get('sort') === 'latest' ? ['-createdAt', '-id'] : ['-sort', '-createdAt', '-id']
    const keyword = q?.trim().slice(0, 80)
    const matches = showPublicOnly && keyword
      ? await publicProjectSearchPage(payload, conditions, keyword, sort, page, limit)
      : null
    if (matches && !matches.ids.length) return json({ docs: [], ...matches.pagination })
    if (matches) conditions.push({ id: { in: matches.ids } })
    if (!showPublicOnly && keyword) conditions.push(...commercialFilters(new URLSearchParams({ q: keyword })))
    const result = await payload.find({
      collection: 'projects',
      where: conditions.length ? { and: conditions } : undefined,
      page: matches ? 1 : page,
      limit,
      sort,
      ...(searchParams.get('view') === 'card' ? { select: {
        introduction: false, operatingRequirements: false, premisesConditions: false,
        customerInfo: false, cooperationMode: false, viewingTimeText: false,
        transferInfo: false, remark: false,
      } } : {}),
      depth: 1,
      overrideAccess: true,
    })
    const docs = result.docs.map(doc => mapProject(doc, Boolean(staff) && searchParams.get('public') !== 'true'))
    const output = searchParams.get('view') === 'card' ? docs.map(doc => {
      const card: Record<string, unknown> = { ...doc }
      for (const key of ['introduction', 'operatingRequirements', 'premisesConditions', 'customerInfo', 'cooperationMode', 'viewingTimeText', 'transferInfo', 'remark', 'images']) delete card[key]
      return card
    }) : docs
    if (matches) return json({ docs: output, ...matches.pagination })
    return json({ docs: output, page: result.page, totalPages: result.totalPages, totalDocs: result.totalDocs, hasNextPage: result.hasNextPage })
  } catch (error) {
    console.error('[GET /api/projects] query failed', error)
    return json({ error: '项目列表暂时无法加载，请稍后重试' }, 500)
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403)
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) {
    return json({ error: '权限不足，无法发布项目' }, 403)
  }

  let input: Record<string, unknown>
  try {
    input = await readJsonObject(request)
  } catch (error) {
    return jsonInputError(error)
  }

  if (!input.title || !input.city || !input.district) {
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

