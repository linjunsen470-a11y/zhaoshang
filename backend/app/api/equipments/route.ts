import { getPayloadInstance, json } from '../_shared/payloadApi'

export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)

  const leadType = searchParams.get('leadType')
  
  const where: any = {
    and: [
      {
        leadType: {
          in: ['equipment_sell', 'equipment_buy', 'equipment_recycle']
        }
      },
      {
        status: {
          not_in: ['closed', 'invalid', 'paused']
        }
      }
    ]
  }

  if (leadType && leadType !== 'all' && leadType !== '全部') {
    where.and.push({ leadType: { equals: leadType } })
  }

  const result = await payload.find({
    collection: 'leads',
    where,
    limit: 100,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  const equipments = result.docs.map(doc => {
    const raw = doc as any
    return {
      id: String(raw.id),
      leadType: raw.leadType,
      businessType: raw.businessType || '',
      budgetRange: raw.budgetRange || '',
      regionPreference: raw.regionPreference || '',
      remark: raw.remark || '',
      equipmentDetails: raw.equipmentDetails ? {
        equipmentName: raw.equipmentDetails.equipmentName || '',
        specText: raw.equipmentDetails.specText || '',
        equipmentCondition: raw.equipmentDetails.equipmentCondition || '',
        expectedPrice: raw.equipmentDetails.expectedPrice || '',
      } : undefined,
      attachments: Array.isArray(raw.attachments) ? raw.attachments.map((item: any) => {
        if (item && typeof item === 'object') {
          return {
            id: String(item.id),
            url: item.url ? ((process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '') + item.url) : undefined
          }
        }
        return { id: String(item), url: undefined }
      }) : [],
      createdAt: typeof raw.createdAt === 'string' ? Date.parse(raw.createdAt) : raw.createdAt,
    }
  })

  return json(equipments)
}
