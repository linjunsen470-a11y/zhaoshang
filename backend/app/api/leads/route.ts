import { ALL, getPayloadInstance, json, mapLead, sanitizeLeadInput } from '../_shared/payloadApi'
import { requireAuth, verifyAuthToken } from '../_shared/auth'

export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const auth = verifyAuthToken(request.headers.get('authorization'))

  const where = auth
    ? { submitterOpenId: { equals: auth.openid } }
    : undefined

  const result = await payload.find({
    collection: 'leads',
    where,
    limit: 100,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  let leads = await Promise.all(result.docs.map(doc => mapLead(doc)))

  for (const key of ['status', 'leadType'] as const) {
    const value = searchParams.get(key)
    if (value && value !== ALL) {
      leads = leads.filter(lead => String(lead[key]) === value)
    }
  }

  // Phone filtering is intentionally ignored for authenticated mini-program users.
  // In unauthenticated legacy/admin calls it remains a compatibility filter.
  const phone = searchParams.get('phone')
  if (!auth && phone) {
    leads = leads.filter(lead => String(lead.phone) === phone)
  }

  const projectId = searchParams.get('projectId')
  if (projectId) {
    leads = leads.filter(lead => String(lead.projectId || '') === projectId)
  }

  return json(leads)
}

export async function POST(request: Request) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (response) {
    return response as Response
  }

  const input = await request.json() as Record<string, unknown>
  if (!input.name || !input.phone) {
    return json({ error: '称呼和手机号为必填项' }, 400)
  }
  if (!/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return json({ error: '手机号格式不正确' }, 400)
  }

  const payload = await getPayloadInstance()
  const doc = await payload.create({
    collection: 'leads',
    data: sanitizeLeadInput(input, auth.openid),
    overrideAccess: true,
  })

  return json(await mapLead(doc), 201)
}
