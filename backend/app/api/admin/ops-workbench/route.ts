import type { Where } from 'payload'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'
import { getProjectMissingFields, REQUIRED_PROJECT_FIELDS } from '../../../../lib/cmsRules.mjs'
import {
  LEAD_TYPE_LABELS,
  categoryForLeadType,
} from '../../../../collections/shared/fieldOptions'

const STALE_HOURS = 24
const TODO_LIMIT = 8

function asRecord(doc: unknown) {
  return doc as Record<string, unknown> & { id: string | number; createdAt?: string; updatedAt?: string }
}

export async function GET(request: Request) {
  try {
    const staff = await getAuthenticatedStaff()
    if (!staff) return json({ error: '请先登录后台' }, 401)

    const includeQuality = new URL(request.url).searchParams.get('view') === 'quality'
    const payload = await getPayloadInstance()
    const staleBefore = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

    const [newLeads, staleLeads, projectsPage] = await Promise.all([
      payload.find({
        collection: 'leads',
        where: { status: { equals: 'new' } },
        sort: 'createdAt',
        limit: TODO_LIMIT,
        depth: 0,
        overrideAccess: true,
      }),
      payload.count({
        collection: 'leads',
        where: {
          and: [
            { status: { equals: 'new' } },
            { createdAt: { less_than: staleBefore } },
          ],
        } as Where,
        overrideAccess: true,
      }),
      includeQuality ? payload.find({
        collection: 'projects',
        limit: 500,
        depth: 0,
        overrideAccess: true,
        sort: '-updatedAt',
      }) : Promise.resolve({ docs: [], totalDocs: 0 }),
    ])

    const projectRows = projectsPage.docs.map(doc => {
      const row = asRecord(doc)
      const missing = getProjectMissingFields(row)
      return {
        id: String(row.id),
        title: String(row.title || '未命名房源'),
        status: String(row.status || 'draft'),
        district: String(row.district || ''),
        listingKind: String(row.listingKind || 'unit'),
        venueName: String(row.venueName || ''),
        schoolName: String(row.venueName || row.schoolName || ''),
        missingFields: missing,
        ready: missing.length === 0,
        updatedAt: row.updatedAt,
      }
    })

    const blocked = projectRows.filter(p => !p.ready)
    const readyDrafts = projectRows.filter(p => p.ready && (p.status === 'draft' || p.status === 'offline'))
    const publicIncomplete = projectRows.filter(p => !p.ready && ['online', 'coming', 'full'].includes(p.status))

    const mapLeadTodo = (doc: (typeof newLeads.docs)[number]) => {
      const row = asRecord(doc)
      const leadType = String(row.leadType || 'leasing')
      return {
        id: String(row.id),
        name: String(row.name || '未填写'),
        phone: String(row.phone || ''),
        leadType,
        leadTypeLabel: LEAD_TYPE_LABELS[leadType] || leadType,
        category: categoryForLeadType(leadType),
        status: String(row.status || 'new'),
        createdAt: row.createdAt,
        businessType: String(row.businessType || ''),
        isStale: Boolean(row.createdAt && row.createdAt < staleBefore),
      }
    }

    return json({
      generatedAt: new Date().toISOString(),
      staleHours: STALE_HOURS,
      team: {
        label: '团队待办（全员视图）',
        summary: {
          newLeads: newLeads.totalDocs,
          staleLeads: staleLeads.totalDocs,
          ...(includeQuality ? {
            blockedProjects: blocked.length,
            readyToPublish: readyDrafts.length,
            publicIncomplete: publicIncomplete.length,
          } : {}),
        },
        newLeads: newLeads.docs.map(mapLeadTodo),
        ...(includeQuality ? {
          blockedProjects: blocked.slice(0, TODO_LIMIT),
          readyToPublish: readyDrafts.slice(0, TODO_LIMIT),
        } : {}),
      },
      ...(includeQuality ? { quality: {
        scanned: projectRows.length,
        truncated: projectsPage.totalDocs > projectRows.length,
        totalProjects: projectsPage.totalDocs,
        readyCount: projectRows.filter(p => p.ready).length,
        blockedCount: blocked.length,
        readyToPublishCount: readyDrafts.length,
        publicIncompleteCount: publicIncomplete.length,
        requiredFields: [...REQUIRED_PROJECT_FIELDS.map(field => field.label), '商业场景'],
        blocked: blocked.slice(0, 20),
        publicIncomplete: publicIncomplete.slice(0, 10),
      } } : {}),
    })
  } catch (err) {
    console.error('[GET /api/admin/ops-workbench]', err)
    return json({ error: err instanceof Error ? err.message : '运营工作台加载失败' }, 500)
  }
}
