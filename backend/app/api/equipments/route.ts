import { getPayloadInstance, json, maskPublicRegion, truncatePublicText, absoluteUrl } from '../_shared/payloadApi'


export async function GET(request: Request) {
  const payload = await getPayloadInstance()
  const { searchParams } = new URL(request.url)

  const leadType = searchParams.get('leadType')
  
  const andConditions: Record<string, unknown>[] = [
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

  if (leadType && leadType !== 'all' && leadType !== '全部') {
    andConditions.push({ leadType: { equals: leadType } })
  }

  const where = { and: andConditions }

  const result = await payload.find({
    collection: 'leads',
    where: where as never,
    limit: 100,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  const equipments = result.docs.map(doc => {
    const raw = doc as unknown as Record<string, unknown> & {
      equipmentDetails?: Record<string, unknown>
      attachments?: (Record<string, unknown> | string | number)[]
    }
    const details = raw.equipmentDetails || {}
    return {
      id: String(raw.id),
      leadType: raw.leadType,
      businessType: raw.businessType || '',
      budgetRange: raw.budgetRange || '',
      regionPreference: maskPublicRegion(raw.regionPreference),
      remark: truncatePublicText(raw.remark),
      equipmentDetails: raw.equipmentDetails ? {
        equipmentName: details.equipmentName || '',
        specText: details.specText || '',
        equipmentCondition: details.equipmentCondition || '',
        expectedPrice: details.expectedPrice || '',
      } : undefined,
      attachments: Array.isArray(raw.attachments) ? raw.attachments.map((item) => {
        if (item && typeof item === 'object') {
          const media = item as Record<string, unknown>
          return {
            id: String(media.id),
            url: media.url ? absoluteUrl(String(media.url)) : undefined
          }
        }
        return { id: String(item), url: undefined }
      }) : [],

      createdAt: typeof raw.createdAt === 'string' ? Date.parse(raw.createdAt) : (typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()),
    }
  })

  return json(equipments)
}
