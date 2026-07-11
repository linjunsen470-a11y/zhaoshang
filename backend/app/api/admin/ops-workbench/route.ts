import type { Where } from 'payload'
import { getAuthenticatedStaff } from '../../_shared/auth'
import { absoluteUrl, getPayloadInstance, json } from '../../_shared/payloadApi'
import { getProjectMissingFields } from '../../../../collections/Projects'
import {
  LEAD_CATEGORY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_LABELS,
  categoryForLeadType,
} from '../../../../collections/shared/fieldOptions'
import { buildShareMaterial } from '../../../../lib/shareMaterials'

const STALE_HOURS = 24
const TODO_LIMIT = 8

function asRecord(doc: unknown) {
  return doc as Record<string, unknown> & { id: string | number; createdAt?: string; updatedAt?: string }
}

export async function GET() {
  try {
    const staff = await getAuthenticatedStaff()
    if (!staff) return json({ error: '请先登录后台' }, 401)

    const payload = await getPayloadInstance()
    const staleBefore = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

    const [newLeads, staleLeads, contactedLeads, closedLeads, convertedLeads, allLeadsPage, projectsPage, shareCandidates] = await Promise.all([
      payload.find({
        collection: 'leads',
        where: { status: { equals: 'new' } },
        sort: '-createdAt',
        limit: TODO_LIMIT,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'leads',
        where: {
          and: [
            { status: { equals: 'new' } },
            { createdAt: { less_than: staleBefore } },
          ],
        } as Where,
        sort: 'createdAt',
        limit: TODO_LIMIT,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'leads',
        where: { status: { equals: 'contacted' } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'leads',
        where: { status: { equals: 'closed' } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'leads',
        where: { generatedProject: { exists: true } } as Where,
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'leads',
        limit: 500,
        depth: 0,
        overrideAccess: true,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'projects',
        limit: 200,
        depth: 0,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
      payload.find({
        collection: 'projects',
        where: { status: { in: ['online', 'coming'] } },
        limit: 20,
        depth: 1,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
    ])

    const totalLeads = newLeads.totalDocs + contactedLeads.totalDocs + closedLeads.totalDocs
    const sampleDocs = allLeadsPage.docs
    const sampleTruncated = allLeadsPage.totalDocs > sampleDocs.length

    const funnel = {
      submitted: totalLeads,
      new: newLeads.totalDocs,
      contacted: contactedLeads.totalDocs,
      closed: closedLeads.totalDocs,
      converted: convertedLeads.totalDocs,
      byCategory: LEAD_CATEGORY_OPTIONS.map(cat => {
        const docs = sampleDocs.filter(d => (cat.types as readonly string[]).includes(String(d.leadType)))
        return {
          category: cat.value,
          label: cat.label,
          total: docs.length,
          new: docs.filter(d => d.status === 'new').length,
          contacted: docs.filter(d => d.status === 'contacted').length,
          closed: docs.filter(d => d.status === 'closed').length,
        }
      }),
      byStatus: LEAD_STATUS_OPTIONS.map(s => ({
        status: s.value,
        label: s.label,
        count: s.value === 'new'
          ? newLeads.totalDocs
          : s.value === 'contacted'
            ? contactedLeads.totalDocs
            : closedLeads.totalDocs,
      })),
      sampleSize: sampleDocs.length,
      truncated: sampleTruncated,
    }

    const projectRows = projectsPage.docs.map(doc => {
      const row = asRecord(doc)
      const missing = getProjectMissingFields(row)
      return {
        id: String(row.id),
        title: String(row.title || '未命名房源'),
        status: String(row.status || 'draft'),
        district: String(row.district || ''),
        schoolName: String(row.schoolName || ''),
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
          blockedProjects: blocked.length,
          readyToPublish: readyDrafts.length,
          publicIncomplete: publicIncomplete.length,
        },
        newLeads: newLeads.docs.map(mapLeadTodo),
        staleLeads: staleLeads.docs.map(mapLeadTodo),
        blockedProjects: blocked.slice(0, TODO_LIMIT),
        readyToPublish: readyDrafts.slice(0, TODO_LIMIT),
      },
      funnel,
      quality: {
        scanned: projectRows.length,
        truncated: projectsPage.totalDocs > projectRows.length,
        totalProjects: projectsPage.totalDocs,
        readyCount: projectRows.filter(p => p.ready).length,
        blockedCount: blocked.length,
        readyToPublishCount: readyDrafts.length,
        publicIncompleteCount: publicIncomplete.length,
        requiredFields: [
          '房源标题', '封面图', '房源类型', '区域', '费用说明', '客群说明', '详情图片',
        ],
        blocked: blocked.slice(0, 20),
        publicIncomplete: publicIncomplete.slice(0, 10),
      },
      share: {
        projects: shareCandidates.docs.map(doc => {
          const row = asRecord(doc)
          const cover = row.coverImage
          let coverImage = ''
          if (typeof cover === 'string' && /^https?:\/\//i.test(cover)) coverImage = cover
          else if (cover && typeof cover === 'object' && 'url' in cover && typeof (cover as { url?: unknown }).url === 'string') {
            coverImage = absoluteUrl(String((cover as { url: string }).url))
          }
          const material = buildShareMaterial({
            id: row.id,
            title: String(row.title || ''),
            schoolName: String(row.schoolName || ''),
            schoolAlias: String(row.schoolAlias || ''),
            district: String(row.district || ''),
            areaText: String(row.areaText || ''),
            feeText: String(row.feeText || ''),
            projectType: String(row.projectType || ''),
            opportunityType: String(row.opportunityType || ''),
            status: String(row.status || ''),
            coverImage,
          })
          return {
            id: String(row.id),
            title: String(row.title || '未命名房源'),
            status: String(row.status || ''),
            schoolName: String(row.schoolName || ''),
            district: String(row.district || ''),
            areaText: String(row.areaText || ''),
            feeText: String(row.feeText || ''),
            opportunityType: String(row.opportunityType || ''),
            ...material,
            coverImage: material.coverImage || coverImage,
          }
        }),
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/ops-workbench]', err)
    return json({ error: err instanceof Error ? err.message : '运营工作台加载失败' }, 500)
  }
}
