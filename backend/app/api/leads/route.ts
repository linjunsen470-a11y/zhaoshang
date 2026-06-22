import type { Where } from 'payload'
import {
  ALL,
  getPayloadInstance,
  json,
  mapLeads,
  sanitizeLeadCreateInput,
  validateAttachmentOwnership,
} from '../_shared/payloadApi'
import { requireAuth, verifyAuthToken } from '../_shared/auth'

export async function GET(request: Request) {
  const auth = verifyAuthToken(request.headers.get('authorization'))
  if (!auth) {
    return json({ error: '未登录或登录已过期' }, 401)
  }

  const { searchParams } = new URL(request.url)
  const payload = await getPayloadInstance()

  const andConditions: Where[] = [
    { submitterOpenId: { equals: auth.openid } }
  ]

  const status = searchParams.get('status')
  if (status && status !== ALL) {
    andConditions.push({ status: { equals: status } })
  }

  const leadType = searchParams.get('leadType')
  if (leadType && leadType !== ALL) {
    andConditions.push({ leadType: { equals: leadType } })
  }

  const projectId = searchParams.get('projectId')
  if (projectId) {
    andConditions.push({ project: { equals: projectId } })
  }

  const result = await payload.find({
    collection: 'leads',
    where: {
      and: andConditions,
    },
    limit: 100,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  const leads = await mapLeads(result.docs)
  return json(leads)
}

export async function POST(request: Request) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : '未登录或登录已过期' }, 401)
  }

  let input: Record<string, unknown>
  try {
    input = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: '无效的 JSON 请求体' }, 400)
  }

  if (!input.name || !input.phone) {
    return json({ error: '称呼和手机号为必填项' }, 400)
  }
  if (!/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return json({ error: '手机号格式不正确' }, 400)
  }

  const attachmentError = await validateAttachmentOwnership(input.attachments, auth.openid)
  if (attachmentError) return attachmentError

  const payload = await getPayloadInstance()
  const doc = await payload.create({
    collection: 'leads',
    data: sanitizeLeadCreateInput(input, auth.openid),
    overrideAccess: true,
  })

  // mapLead is still fine for single mapping
  const { mapLead } = await import('../_shared/payloadApi')
  return json(await mapLead(doc), 201)
}

