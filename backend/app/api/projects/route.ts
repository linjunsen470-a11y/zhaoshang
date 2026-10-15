import { commercialFilters, pageNumber, publicCommercialWhere } from '../../../lib/commercial'
import {
  getPayloadInstance,
  json,
  mapProject,
  sanitizeProjectInput,
} from '../_shared/payloadApi'
import { getAuthenticatedStaff } from '../_shared/auth'
import { readJsonObject, jsonInputError } from '../_shared/requestInput'

export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const staff = await getAuthenticatedStaff('projects')
  const showPublicOnly = !staff || searchParams.get('public') === 'true'
  try {
    const conditions = commercialFilters(searchParams)
    if (showPublicOnly) conditions.push(publicCommercialWhere())
    const paginated = searchParams.get('pagination') === 'true'
    const result = await payload.find({
      collection: 'projects',
      where: conditions.length ? { and: conditions } : undefined,
      page: pageNumber(searchParams.get('page'), 1, 100000),
      limit: pageNumber(searchParams.get('limit'), paginated ? 20 : 100, 100),
      sort: searchParams.get('sort') === 'latest' ? ['-createdAt', '-id'] : ['-sort', '-createdAt', '-id'],
      depth: 1,
      overrideAccess: true,
    })
    const docs = result.docs.map(doc => mapProject(doc, Boolean(staff) && searchParams.get('public') !== 'true'))
    return json(paginated ? { docs, page: result.page, totalPages: result.totalPages, totalDocs: result.totalDocs, hasNextPage: result.hasNextPage } : docs)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '查询失败' }, 400)
  }
}

export async function POST(request: Request) {
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

