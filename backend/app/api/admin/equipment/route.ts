import type { Where } from 'payload'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'

const EQUIPMENT_TYPES = ['equipment_sell', 'equipment_buy', 'equipment_recycle']
const PUBLICATION_STATUSES = new Set(['draft', 'online', 'offline'])

export async function GET(request: Request) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) return json({ error: '请先登录后台' }, 401)
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)
  const conditions: Where[] = [{ leadType: { in: EQUIPMENT_TYPES } }]
  const q = searchParams.get('q')?.trim().slice(0, 80)
  const status = searchParams.get('status')
  const leadType = searchParams.get('leadType')
  const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)
  if (q) conditions.push({ or: [{ businessType: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }] })
  if (status && PUBLICATION_STATUSES.has(status)) conditions.push({ 'equipmentPublication.status': { equals: status } })
  if (leadType && EQUIPMENT_TYPES.includes(leadType)) conditions.push({ leadType: { equals: leadType } })

  const result = await payload.find({
    collection: 'leads',
    where: { and: conditions },
    page,
    limit: 25,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  return json({
    docs: result.docs.map(doc => {
      const publication = (doc.equipmentPublication || {}) as Record<string, unknown>
      const details = (doc.equipmentDetails || {}) as Record<string, unknown>
      return {
        id: String(doc.id),
        name: String(doc.name || ''),
        phone: String(doc.phone || ''),
        leadType: String(doc.leadType || ''),
        equipmentName: String(details.equipmentName || doc.businessType || ''),
        expectedPrice: String(details.expectedPrice || doc.budgetRange || ''),
        regionPreference: String(doc.regionPreference || ''),
        publicationStatus: String(publication.status || 'draft'),
        publicRemark: String(publication.publicRemark || ''),
        createdAt: doc.createdAt,
      }
    }),
    page: result.page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  })
}

export async function PATCH(request: Request) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) return json({ error: '请先登录后台' }, 401)
  let body: { id?: unknown; status?: unknown; publicRemark?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: '请求内容不是有效的 JSON' }, 400)
  }
  const id = String(body.id || '')
  const status = String(body.status || '')
  if (!id || !PUBLICATION_STATUSES.has(status)) return json({ error: '设备发布状态无效' }, 400)

  const payload = await getPayloadInstance()
  const current = await payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: true })
  if (!EQUIPMENT_TYPES.includes(String(current.leadType || ''))) return json({ error: '该记录不是设备供需' }, 400)
  const publication = (current.equipmentPublication || {}) as Record<string, unknown>
  const doc = await payload.update({
    collection: 'leads',
    id,
    data: {
      equipmentPublication: {
        ...publication,
        status,
        publicRemark: String(body.publicRemark ?? publication.publicRemark ?? '').slice(0, 1000),
      },
    },
    overrideAccess: true,
  })
  return json({ id: String(doc.id), publicationStatus: doc.equipmentPublication?.status })
}
