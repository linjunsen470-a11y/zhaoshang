import type { Where } from 'payload'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'

const VALID_STATUSES = new Set(['new', 'contacted', 'closed'])

function relation(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return { id: String(value), title: '' }
  if (value && typeof value === 'object') {
    const doc = value as Record<string, unknown>
    return { id: String(doc.id || ''), title: String(doc.title || '') }
  }
  return null
}

export async function GET(request: Request) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) return json({ error: '请先登录后台' }, 401)
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const conditions: Where[] = []
  const q = searchParams.get('q')?.trim().slice(0, 80)
  const status = searchParams.get('status')
  const leadType = searchParams.get('leadType')
  const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)

  if (q) conditions.push({ or: [{ name: { contains: q } }, { phone: { contains: q } }, { businessType: { contains: q } }] })
  if (status && VALID_STATUSES.has(status)) conditions.push({ status: { equals: status } })
  if (leadType) conditions.push({ leadType: { equals: leadType } })

  const result = await payload.find({
    collection: 'leads',
    where: conditions.length ? { and: conditions } : undefined,
    page,
    limit: 25,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  return json({
    docs: result.docs.map(doc => ({
      id: String(doc.id),
      name: String(doc.name || ''),
      phone: String(doc.phone || ''),
      leadType: String(doc.leadType || 'leasing'),
      status: String(doc.status || 'new'),
      businessType: String(doc.businessType || ''),
      budgetRange: String(doc.budgetRange || ''),
      regionPreference: String(doc.regionPreference || ''),
      remark: String(doc.remark || ''),
      internalNote: String(doc.internalNote || ''),
      project: relation(doc.project),
      generatedProject: relation(doc.generatedProject),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })),
    page: result.page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  })
}

export async function PATCH(request: Request) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) return json({ error: '请先登录后台' }, 401)
  let body: { id?: unknown; status?: unknown; internalNote?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: '请求内容不是有效的 JSON' }, 400)
  }
  const id = String(body.id || '')
  const status = String(body.status || '')
  if (!id || !VALID_STATUSES.has(status)) return json({ error: '咨询状态无效' }, 400)

  const payload = await getPayloadInstance()
  const doc = await payload.update({
    collection: 'leads',
    id,
    data: { status, internalNote: String(body.internalNote || '').slice(0, 2000) },
    overrideAccess: true,
  })
  return json({ id: String(doc.id), status: doc.status, internalNote: doc.internalNote })
}
