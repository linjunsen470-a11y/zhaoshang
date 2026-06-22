import { getPayloadInstance, json, mapFollow, toDatabaseId } from '../../../_shared/payloadApi'
import { getAuthenticatedStaff } from '../../../_shared/auth'

type Args = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Args) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) {
    return json({ error: '权限不足，无法添加跟进记录' }, 403)
  }

  const { id } = await params
  let input: Record<string, unknown>
  try {
    input = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: '无效的 JSON 请求体' }, 400)
  }

  if (!input.content) {
    return json({ error: '跟进内容不能为空' }, 400)
  }

  const payload = await getPayloadInstance()

  try {
    await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true })
  } catch {
    return json({ error: '线索不存在' }, 404)
  }

  const staffUser = staff as Record<string, unknown>
  const doc = await payload.create({
    collection: 'follow-records',
    data: {
      lead: toDatabaseId(id)!,
      content: input.content,
      nextFollowAt: input.nextFollowAt ? new Date(Number(input.nextFollowAt)).toISOString() : undefined,
      operatorName: String(staffUser.name || staffUser.email || '管理员'),
    },
    overrideAccess: true,
  })


  return json(mapFollow(doc), 201)
}

