import { getPayloadInstance, json, mapFollow, toDatabaseId } from '../../../_shared/payloadApi'

type Args = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Args) {
  const { id } = await params
  const input = await request.json() as Record<string, unknown>

  if (!input.content) {
    return json({ error: '跟进内容不能为空' }, 400)
  }

  const payload = await getPayloadInstance()

  try {
    await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true })
  } catch {
    return json({ error: '线索不存在' }, 404)
  }

  const doc = await payload.create({
    collection: 'follow-records',
    data: {
      lead: toDatabaseId(id)!,
      content: input.content,
      nextFollowAt: input.nextFollowAt ? new Date(Number(input.nextFollowAt)).toISOString() : undefined,
      operatorName: input.operatorName || '系统管理员',
    },
    overrideAccess: true,
  })

  return json(mapFollow(doc), 201)
}
