import type { Where } from 'payload'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'
import { leadTypesForCategory } from '@/collections/shared/fieldOptions'

const VALID_STATUSES = new Set(['new', 'contacted', 'closed'])

function relation(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return { id: String(value), title: '' }
  }
  if (value && typeof value === 'object') {
    const doc = value as Record<string, unknown>
    return { id: String(doc.id || ''), title: String(doc.title || '') }
  }
  return null
}

export async function GET(request: Request) {
  try {
    const staff = await getAuthenticatedStaff('leads')
    if (!staff) return json({ error: '请先登录后台' }, 401)

    const payload = await getPayloadInstance()
    const { searchParams } = new URL(request.url)
    const conditions: Where[] = []
    const q = searchParams.get('q')?.trim().slice(0, 80)
    const status = searchParams.get('status')
    const leadType = searchParams.get('leadType')
    const category = searchParams.get('category')
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)

    if (q) {
      conditions.push({
        or: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { businessType: { contains: q } },
        ],
      })
    }
    if (status && VALID_STATUSES.has(status)) {
      conditions.push({ status: { equals: status } })
    }

    const categoryTypes = leadTypesForCategory(category)
    if (leadType) {
      if (categoryTypes && !categoryTypes.includes(leadType)) {
        return json({ error: '咨询类型与业务线不匹配' }, 400)
      }
      conditions.push({ leadType: { equals: leadType } })
    } else if (categoryTypes?.length) {
      conditions.push({ leadType: { in: [...categoryTypes] } })
    }

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
      page: result.page ?? page,
      totalPages: result.totalPages ?? 1,
      totalDocs: result.totalDocs ?? 0,
    })
  } catch (err) {
    console.error('[GET /api/admin/inquiries]', err)
    const message = err instanceof Error ? err.message : '咨询列表加载失败'
    // Surface schema drift clearly for local ops
    if (/column .* does not exist|relation .* does not exist/i.test(message)) {
      return json({
        error: '数据库结构未同步（缺少字段）。请在 backend 执行：pnpm exec node scripts/ensure-leads-schema.mjs',
        detail: message,
      }, 500)
    }
    return json({ error: message }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
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
    if (!id || !VALID_STATUSES.has(status)) {
      return json({ error: '咨询状态无效' }, 400)
    }

    const payload = await getPayloadInstance()
    const doc = await payload.update({
      collection: 'leads',
      id,
      data: {
        status,
        internalNote: String(body.internalNote || '').slice(0, 2000),
      },
      overrideAccess: true,
    })

    return json({
      id: String(doc.id),
      status: doc.status,
      internalNote: doc.internalNote,
    })
  } catch (err) {
    console.error('[PATCH /api/admin/inquiries]', err)
    const message = err instanceof Error ? err.message : '保存失败'
    return json({ error: message }, 500)
  }
}
