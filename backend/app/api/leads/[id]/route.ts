import { getPayloadInstance, json, mapLead, sanitizeLeadInput } from '../../_shared/payloadApi'

type Args = {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: Args) {
  const { id } = await params
  const input = await request.json() as Record<string, unknown>
  const payload = await getPayloadInstance()

  try {
    const doc = await payload.update({
      collection: 'leads',
      id,
      data: sanitizeLeadInput(input),
      overrideAccess: true,
    })
    return json(await mapLead(doc))
  } catch {
    return json({ error: '线索不存在' }, 404)
  }
}
