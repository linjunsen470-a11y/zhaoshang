import { getPayloadInstance, json, mapProject, sanitizeProjectInput } from '../../_shared/payloadApi'

type Args = {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Args) {
  const { id } = await params
  const payload = await getPayloadInstance()

  try {
    const doc = await payload.findByID({ collection: 'projects', id, depth: 1, overrideAccess: true })
    return json(mapProject(doc))
  } catch {
    return json({ error: '项目不存在' }, 404)
  }
}

export async function PUT(request: Request, { params }: Args) {
  const { id } = await params
  const input = await request.json() as Record<string, unknown>
  const payload = await getPayloadInstance()

  try {
    const doc = await payload.update({
      collection: 'projects',
      id,
      data: sanitizeProjectInput(input),
      overrideAccess: true,
    })
    return json(mapProject(doc))
  } catch {
    return json({ error: '项目不存在' }, 404)
  }
}

export async function DELETE(_: Request, { params }: Args) {
  const { id } = await params
  const payload = await getPayloadInstance()

  try {
    await payload.delete({ collection: 'projects', id, overrideAccess: true })
    return json({ success: true })
  } catch {
    return json({ error: '项目不存在' }, 404)
  }
}
