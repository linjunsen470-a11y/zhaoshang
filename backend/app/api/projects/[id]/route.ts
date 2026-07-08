import { getPayloadInstance, json, mapProject, PUBLIC_STATUSES, sanitizeProjectInput } from '../../_shared/payloadApi'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { isAdminUser } from '../../../../collections/shared/access'

type Args = {
  params: Promise<{ id: string }>
}

function isPublicProject(doc: Record<string, unknown>) {
  const status = typeof doc.status === 'string' ? doc.status : ''
  const auditStatus = typeof doc.auditStatus === 'string' ? doc.auditStatus : ''
  return PUBLIC_STATUSES.includes(status) && auditStatus !== 'rejected'
}

export async function GET(request: Request, { params }: Args) {
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
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) {
    return json({ error: '权限不足' }, 403)
  }

  const { id } = await params
  let input: Record<string, unknown>
  try {
    input = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: '无效的 JSON 请求体' }, 400)
  }

  const payload = await getPayloadInstance()

  try {
    const doc = await payload.update({
      collection: 'projects',
      id,
      data: sanitizeProjectInput(input),
      overrideAccess: true,
    })
    return json(mapProject(doc, !!staff))
  } catch {
    return json({ error: '项目不存在或更新失败' }, 404)
  }
}

export async function DELETE(_: Request, { params }: Args) {
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

