import { getPayloadInstance, json, mapProject } from '../_shared/payloadApi'
import { getAuthenticatedStaff } from '../_shared/auth'

export async function GET() {
  const staff = await getAuthenticatedStaff()
  if (!staff) {
    return json({ error: '权限不足，无法查看统计看板' }, 403)
  }

  const payload = await getPayloadInstance()
  const [projectsResult, leadsResult] = await Promise.all([
    payload.find({ collection: 'projects', limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'leads', limit: 1000, depth: 1, overrideAccess: true }),
  ])

  const projects = projectsResult.docs.map(doc => mapProject(doc))
  const leads = leadsResult.docs

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const leadTypeCounts = leads.reduce<Record<string, number>>((acc, doc) => {
    const type = String(doc.leadType || 'leasing')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const projectLeadCounts = leads.reduce<Record<string, number>>((acc, doc) => {
    const projId = doc.project && typeof doc.project === 'object' ? (doc.project as { id?: string | number }).id : doc.project
    if (projId) {
      acc[String(projId)] = (acc[String(projId)] || 0) + 1
    }
    return acc
  }, {})


  const toTimestamp = (val: unknown) => {
    if (val instanceof Date) return val.getTime()
    if (typeof val === 'string') {
      const time = Date.parse(val)
      return Number.isNaN(time) ? Date.now() : time
    }
    return Date.now()
  }

  return json({
    totalProjects: projects.length,
    onlineProjects: projects.filter(project => project.status === 'online').length,
    transferProjects: projects.filter(project => project.opportunityType === 'transfer').length,
    equipmentLeads: leads.filter(doc => ['equipment_sell', 'equipment_buy'].includes(String(doc.leadType))).length,
    todayLeads: leads.filter(doc => toTimestamp(doc.createdAt) >= todayStart.getTime()).length,
    monthLeads: leads.filter(doc => toTimestamp(doc.createdAt) >= monthStart.getTime()).length,
    pendingLeads: leads.filter(doc => (doc.status || 'new') === 'new').length,
    closedLeads: leads.filter(doc => doc.status === 'closed').length,
    leadTypeCounts,
    popularProjects: projects
      .map(project => ({
        id: project.id,
        title: project.title,
        schoolName: project.schoolName,
        leadCount: projectLeadCounts[String(project.id)] || 0,
      }))
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, 5),
  })
}

