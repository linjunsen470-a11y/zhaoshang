import { commercialIsPublic, commercialScene } from '../../../lib/commercial'
import type { Where } from 'payload'
import {
  ALL,
  MINI_PROGRAM_LEAD_TYPES,
  getPayloadInstance,
  json,
  mapLead,
  mapLeads,
  sanitizeLeadCreateInput,
  validateLeadUserInput,
  validateAttachmentOwnership,
} from '../_shared/payloadApi'
import { requireAuth, verifyAuthToken } from '../_shared/auth'
import { getClientIp, takeRateLimit } from '../_shared/rateLimit'
import { readJsonObject, jsonInputError } from '../_shared/requestInput'

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
    if (!MINI_PROGRAM_LEAD_TYPES.includes(leadType)) {
      return json({ error: '线索类型无效' }, 400)
    }
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

  const ipRate = takeRateLimit(`lead-create-ip:${getClientIp(request)}`, 30, 60 * 60 * 1000)
  const userRate = takeRateLimit(`lead-create-user:${auth.openid}`, 10, 60 * 60 * 1000)
  const retryAfterSeconds = Math.max(ipRate.retryAfterSeconds, userRate.retryAfterSeconds)
  if (!ipRate.allowed || !userRate.allowed) {
    return Response.json(
      { error: '提交过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    )
  }

  let input: Record<string, unknown>
  try {
    input = await readJsonObject(request)
  } catch (error) {
    return jsonInputError(error)
  }

  if (typeof input.name !== 'string' || !input.name.trim() || !input.phone) {
    return json({ error: '称呼和手机号为必填项' }, 400)
  }
  if (!/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return json({ error: '手机号格式不正确' }, 400)
  }
  if (!MINI_PROGRAM_LEAD_TYPES.includes(String(input.leadType || 'leasing'))) {
    return json({ error: '线索类型无效' }, 400)
  }
  const validationError = validateLeadUserInput(input)
  if (validationError) return json({ error: validationError }, 400)

  const attachmentError = await validateAttachmentOwnership(input.attachments, auth.openid)
  if (attachmentError) return attachmentError

  const payload = await getPayloadInstance()
  if (input.projectId || input.project) {
    try {
      const project = await payload.findByID({ collection: 'projects', id: String(input.projectId || input.project), depth: 1, overrideAccess: true })
      if (!commercialIsPublic(project) || project.status === 'full') return json({ error: '该项目暂不接受咨询' }, 400)
      input.businessScene = commercialScene(project)
    } catch { return json({ error: '咨询项目不存在' }, 400) }
  }
  const doc = await payload.create({
    collection: 'leads',
    data: sanitizeLeadCreateInput(input, auth.openid),
    overrideAccess: true,
  })

  return json(await mapLead(doc), 201)
}

