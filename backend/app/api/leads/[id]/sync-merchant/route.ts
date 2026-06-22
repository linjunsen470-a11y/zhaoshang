import { getPayloadInstance, json, toDatabaseId } from '../../../_shared/payloadApi'
import { getAuthenticatedStaff } from '../../../_shared/auth'

type Args = {
  params: Promise<{ id: string }>
}

function uniqueIds(values: Array<string | number | undefined>) {
  return [...new Set(values.map(value => String(value)).filter(Boolean))]
}

export async function POST(request: Request, { params }: Args) {
  const staff = await getAuthenticatedStaff('leads')
  if (!staff) {
    return json({ error: '权限不足，无法同步商户档案' }, 403)
  }

  const { id } = await params
  const payload = await getPayloadInstance()


  interface LeadDoc {
    name?: string
    phone?: string
    businessType?: string
    budgetRange?: string
    regionPreference?: string
    hasCampusExperience?: boolean
    leadType?: string
    remark?: string
    merchantProfile?: string | number | null
  }

  let lead: LeadDoc
  try {
    lead = await payload.findByID({
      collection: 'leads',
      id,
      depth: 0,
      overrideAccess: true,
    }) as unknown as LeadDoc
  } catch {
    return json({ error: '线索不存在' }, 404)
  }

  if (!lead.phone) {
    return json({ error: '线索缺少联系电话，无法沉淀商户档案' }, 400)
  }

  const businessTypes = lead.businessType ? [lead.businessType] : []
  const existing = await payload.find({
    collection: 'merchant-profiles',
    where: {
      phone: { equals: lead.phone },
    },
    limit: 1,
    overrideAccess: true,
  })

  const profileId = existing.docs[0]?.id
  const relatedLeadIds = uniqueIds([
    ...(Array.isArray(existing.docs[0]?.relatedLeads)
      ? existing.docs[0].relatedLeads.map(item => (typeof item === 'object' && item ? item.id : item))
      : []),
    id,
  ])

  const sharedData = {
    name: lead.name || existing.docs[0]?.name || '未命名商户',
    phone: lead.phone,
    budgetRange: lead.budgetRange || existing.docs[0]?.budgetRange || '',
    preferredRegion: lead.regionPreference || existing.docs[0]?.preferredRegion || '',
    hasCampusExperience: Boolean(lead.hasCampusExperience ?? existing.docs[0]?.hasCampusExperience),
    acceptsTransfer: lead.leadType === 'transfer' || Boolean(existing.docs[0]?.acceptsTransfer),
    needsEquipment: Boolean(
      (lead.leadType && lead.leadType.startsWith('equipment'))
      || existing.docs[0]?.needsEquipment,
    ),
    businessTypes: businessTypes.length
      ? businessTypes
      : (Array.isArray(existing.docs[0]?.businessTypes) ? existing.docs[0].businessTypes : []),
    notes: [existing.docs[0]?.notes, lead.remark].filter(Boolean).join('\n---\n'),
    relatedLeads: relatedLeadIds.map(leadId => toDatabaseId(leadId)).filter(Boolean),
    status: existing.docs[0]?.status || 'active',
  }

  let savedProfileId: string | number

  if (profileId) {
    const updated = await payload.update({
      collection: 'merchant-profiles',
      id: profileId,
      data: sharedData as never,
      overrideAccess: true,
    })
    savedProfileId = updated.id
  } else {
    const created = await payload.create({
      collection: 'merchant-profiles',
      data: sharedData as never,
      overrideAccess: true,
    })
    savedProfileId = created.id
  }

  await payload.update({
    collection: 'leads',
    id: toDatabaseId(id)!,
    data: {
      merchantProfile: savedProfileId,
    },
    overrideAccess: true,
  })

  return json({
    success: true,
    profileId: savedProfileId,
    created: !profileId,
  })
}