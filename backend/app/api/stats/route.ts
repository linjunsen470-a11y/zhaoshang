import { getPayloadInstance, json, mapLead, mapProject } from '../_shared/payloadApi'

export async function GET() {
  const payload = await getPayloadInstance()
  const [projectsResult, leadsResult] = await Promise.all([
    payload.find({ collection: 'projects', limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'leads', limit: 1000, depth: 1, overrideAccess: true }),
  ])

  const projects = projectsResult.docs.map(doc => mapProject(doc))
  const leads = await Promise.all(leadsResult.docs.map(doc => mapLead(doc)))

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const leadTypeCounts = leads.reduce<Record<string, number>>((acc, lead) => {
    const type = String(lead.leadType || 'leasing')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const projectLeadCounts = leads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.projectId) acc[String(lead.projectId)] = (acc[String(lead.projectId)] || 0) + 1
    return acc
  }, {})

  return json({
    totalProjects: projects.length,
    onlineProjects: projects.filter(project => project.status === 'online').length,
    transferProjects: projects.filter(project => project.opportunityType === 'transfer').length,
    equipmentLeads: leads.filter(lead => ['equipment_sell', 'equipment_buy'].includes(String(lead.leadType))).length,
    todayLeads: leads.filter(lead => Number(lead.createdAt) >= todayStart.getTime()).length,
    monthLeads: leads.filter(lead => Number(lead.createdAt) >= monthStart.getTime()).length,
    pendingLeads: leads.filter(lead => lead.status === 'new').length,
    closedLeads: leads.filter(lead => lead.status === 'closed').length,
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
