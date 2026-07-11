import { getAuthenticatedStaff } from '../../../../_shared/auth'
import { getPayloadInstance, json } from '../../../../_shared/payloadApi'
import { DISTRICT_OPTIONS } from '../../../../../../collections/shared/fieldOptions'

type Args = { params: Promise<{ id: string }> }

function relationId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: string | number }).id
  return undefined
}

export async function POST(_: Request, { params }: Args) {
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) return json({ error: '请先登录后台' }, 401)
  const { id } = await params
  const payload = await getPayloadInstance()
  const lead = await payload.findByID({ collection: 'leads', id, depth: 1, overrideAccess: true })
  if (lead.leadType !== 'transfer') return json({ error: '只有店铺转让咨询可以生成房源' }, 400)

  if (lead.generatedProject) {
    return json({ error: '该咨询已经生成过房源', projectId: relationId(lead.generatedProject) }, 409)
  }

  const sourceLeadKey = `lead:${lead.id}`
  const existing = await payload.find({
    collection: 'projects',
    where: { sourceLeadKey: { equals: sourceLeadKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    await payload.update({ collection: 'leads', id, data: { generatedProject: existing.docs[0].id }, overrideAccess: true })
    return json({ error: '该咨询已经生成过房源', projectId: existing.docs[0].id }, 409)
  }

  const details = (lead.transferDetails || {}) as Record<string, unknown>
  const attachments = Array.isArray(lead.attachments) ? lead.attachments.map(relationId).filter(Boolean) : []
  const location = String(details.locationText || lead.regionPreference || '').trim()
  const district = DISTRICT_OPTIONS.some(option => option.value === lead.regionPreference) ? String(lead.regionPreference) : ''
  let project
  try {
    project = await payload.create({
      collection: 'projects',
      data: {
        title: location ? `${location}店铺转让` : `${lead.name || '客户'}的店铺转让`,
        opportunityType: 'transfer',
        city: '广州',
        district,
        projectType: '店铺转让',
        feeText: String(details.feeText || ''),
        customerInfo: String(lead.remark || ''),
        coverImage: attachments[0],
        images: attachments,
        transferInfo: {
          currentBusiness: String(lead.businessType || ''),
          remainingTerm: String(details.remainingTerm || ''),
          includesEquipment: Boolean(details.includesEquipment),
          expectedTransferFee: String(details.transferFee || ''),
        },
        status: 'draft',
        sourceLead: lead.id,
        sourceLeadKey,
      },
      overrideAccess: true,
    })
  } catch (error) {
    const duplicate = await payload.find({ collection: 'projects', where: { sourceLeadKey: { equals: sourceLeadKey } }, limit: 1, depth: 0, overrideAccess: true })
    if (duplicate.docs[0]) return json({ error: '该咨询已经生成过房源', projectId: duplicate.docs[0].id }, 409)
    throw error
  }
  await payload.update({ collection: 'leads', id, data: { generatedProject: project.id }, overrideAccess: true })
  return json({ projectId: String(project.id), title: project.title }, 201)
}
