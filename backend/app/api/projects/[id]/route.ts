import { getPayloadInstance, isPublicProject, json, mapProject, sanitizeProjectInput } from '../../_shared/payloadApi'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { readJsonObject, jsonInputError, sameOrigin } from '../../_shared/requestInput'
import { isAdminUser } from '../../../../collections/shared/access'

type Args = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Args) {
  const { id } = await params
  const payload = await getPayloadInstance()

  try {
    const doc = await payload.findByID({ collection: 'projects', id, depth: 1, overrideAccess: true })
    const staff = await getAuthenticatedStaff('projects')
    if (!staff && !isPublicProject(doc as Record<string, unknown>)) {
      return json({ error: '项目不存在' }, 404)
    }
    return json(mapProject(doc, !!staff))
  } catch {
    return json({ error: '项目不存在' }, 404)
  }
}

export async function PUT(request: Request, { params }: Args) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403)
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) {
    return json({ error: '权限不足' }, 403)
  }

  const { id } = await params
  let input: Record<string, unknown>
  try {
    input = await readJsonObject(request)
  } catch (error) {
    return jsonInputError(error)
  }

  const payload = await getPayloadInstance()

  try {
    const doc = await payload.update({
      collection: 'projects',
      id,
      data: Object.fromEntries(Object.entries(sanitizeProjectInput(input)).filter(([key]) => Object.hasOwn(input, key))),
      overrideAccess: true,
    })
    return json(mapProject(doc, !!staff))
  } catch {
    return json({ error: '项目不存在或更新失败' }, 404)
  }
}

export async function DELETE(request: Request, { params }: Args) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403)
  const staff = await getAuthenticatedStaff('projects')
  if (!staff || !isAdminUser(staff)) {
    return json({ error: '权限不足，仅管理员可删除项目' }, 403)
  }

  const { id } = await params
  const payload = await getPayloadInstance()

  try {
    await payload.delete({ collection: 'projects', id, overrideAccess: true })
    return json({ success: true })
  } catch {
    return json({ error: '项目不存在或删除失败' }, 404)
  }
}

