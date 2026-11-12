import { pageNumber } from '../../../lib/commercial'
import { createHash } from 'node:crypto'
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
  validateLeadCreateRequirements,
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
    page: pageNumber(searchParams.get('page'), 1, 100000),
    limit: pageNumber(searchParams.get('limit'), 100, 100),
    sort: ['-createdAt', '-id'],
    depth: 1,
    overrideAccess: true,
  })

  const leads = await mapLeads(result.docs)
  return json(searchParams.has('page') ? { docs: leads, page: result.page, totalDocs: result.totalDocs, hasNextPage: result.hasNextPage } : leads)
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

  if (!input.phone) {
    return json({ error: '手机号为必填项' }, 400)
  }
  if (!/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return json({ error: '手机号格式不正确' }, 400)
  }
  if (!MINI_PROGRAM_LEAD_TYPES.includes(String(input.leadType || 'leasing'))) {
    return json({ error: '线索类型无效' }, 400)
  }
  const validationError = validateLeadUserInput(input)
  if (validationError) return json({ error: validationError }, 400)
  const requiredError = validateLeadCreateRequirements(input)
  if (requiredError) return json({ error: requiredError }, 400)

  if (input.project !== undefined || (input.projectId != null && (
    !['number', 'string'].includes(typeof input.projectId) || !/^[1-9]\d*$/.test(String(input.projectId)) || !Number.isSafeInteger(Number(input.projectId))
  ))) return json({ error: '关联房源编号无效' }, 400)
  const data = sanitizeLeadCreateInput(input, auth.openid)

  let submissionKey: string | undefined
  if (input.submissionId !== undefined) {
    if (typeof input.submissionId !== 'string' || !/^[a-z0-9-]{16,80}$/i.test(input.submissionId)) {
      return json({ error: '提交编号格式无效' }, 400)
    }
    submissionKey = createHash('sha256').update(JSON.stringify([auth.openid, input.submissionId])).digest('hex')
  }
  const payload = await getPayloadInstance()
  const existingSubmission = async () => (await payload.find({
    collection: 'leads', where: { and: [{ submissionKey: { equals: submissionKey } }, { submitterOpenId: { equals: auth.openid } }] },
    limit: 1, depth: 1, overrideAccess: true,
  })).docs[0]
  if (submissionKey) {
    const existing = await existingSubmission()
    if (existing) return json(await mapLead(existing))
  }
  const attachmentError = await validateAttachmentOwnership(input.attachments, auth.openid)
  if (attachmentError) return attachmentError

  if (data.project !== undefined) {
    try {
      const project = await payload.findByID({ collection: 'projects', id: data.project, depth: 1, overrideAccess: true })
      if (!commercialIsPublic(project) || project.status === 'full') return json({ error: '该项目暂不接受咨询' }, 400)
      data.businessScene = commercialScene(project)
    } catch { return json({ error: '咨询项目不存在' }, 400) }
  }
  try {
    const doc = await payload.create({
      collection: 'leads', data: { ...data, submissionKey }, overrideAccess: true,
    })
    return json(await mapLead(doc), 201)
  } catch (error) {
    // A concurrent retry may have committed under the unique key.
    if (submissionKey) {
      const existing = await existingSubmission()
      if (existing) return json(await mapLead(existing))
    }
    throw error
  }
}

