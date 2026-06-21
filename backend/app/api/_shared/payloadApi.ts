import config from '@/payload.config'
import { getPayload } from 'payload'

export const ALL = '全部'
export const PUBLIC_STATUSES = ['online', 'coming', 'full']

type Doc = Record<string, unknown> & {
  id: string | number
  createdAt?: string | number | null
  updatedAt?: string | number | null
}

type RelatedDoc = Record<string, unknown> & {
  id?: string | number
  url?: string | null
  title?: string | null
  alt?: string | null
}

export async function getPayloadInstance() {
  return getPayload({ config })
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function toTimestamp(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const time = Date.parse(value)
    return Number.isNaN(time) ? Date.now() : time
  }
  return Date.now()
}

export function toArrayItems(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'item' in item) {
        const nested = (item as { item?: unknown }).item
        return typeof nested === 'string' ? nested : ''
      }
      return ''
    })
    .filter(Boolean)
}

export function fromArrayItems(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map(item => ({ item }))
}

function publicBaseUrl() {
  return (process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `${publicBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`
}

function imageUrl(value: unknown) {
  if (typeof value === 'string') return absoluteUrl(value)
  if (value && typeof value === 'object') {
    const related = value as RelatedDoc
    return typeof related.url === 'string' ? absoluteUrl(related.url) : undefined
  }
  return undefined
}

function relationId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object') return (value as RelatedDoc).id
  return undefined
}

function relationTitle(value: unknown) {
  if (value && typeof value === 'object') {
    const title = (value as RelatedDoc).title
    return typeof title === 'string' ? title : undefined
  }
  return undefined
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : 0
}

function booleanValue(value: unknown) {
  return Boolean(value)
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function toDatabaseId(value: unknown): string | number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = Number(value)
    return Number.isNaN(num) ? value : num
  }
  if (value && typeof value === 'object' && 'id' in value) {
    const idVal = (value as { id: unknown }).id
    return toDatabaseId(idVal)
  }
  return undefined
}

function ids(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value.map(toDatabaseId).filter(Boolean) as (string | number)[]
}

export function mapMedia(doc: Doc) {
  return {
    id: String(doc.id),
    url: imageUrl(doc),
    alt: stringValue(doc.alt),
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
  }
}

function mapTransferInfo(value: unknown) {
  const info = objectValue(value)
  if (!Object.keys(info).length) return undefined
  return {
    currentBusiness: stringValue(info.currentBusiness),
    monthlyRent: stringValue(info.monthlyRent),
    remainingTerm: stringValue(info.remainingTerm),
    includesEquipment: booleanValue(info.includesEquipment),
    expectedTransferFee: stringValue(info.expectedTransferFee),
    contractTransferAllowed: stringValue(info.contractTransferAllowed),
  }
}

function mapTransferDetails(value: unknown) {
  const details = objectValue(value)
  return {
    locationText: stringValue(details.locationText),
    feeText: stringValue(details.feeText),
    transferFee: stringValue(details.transferFee),
    remainingTerm: stringValue(details.remainingTerm),
    includesEquipment: booleanValue(details.includesEquipment),
  }
}

function mapEquipmentDetails(value: unknown) {
  const details = objectValue(value)
  return {
    equipmentName: stringValue(details.equipmentName),
    specText: stringValue(details.specText),
    equipmentCondition: stringValue(details.equipmentCondition),
    expectedPrice: stringValue(details.expectedPrice),
  }
}

export function mapProject(doc: Doc) {
  const opportunityType = doc.opportunityType === 'transfer' ? 'transfer' : 'leasing'
  const images = Array.isArray(doc.images) ? doc.images.map(imageUrl).filter(Boolean) : []
  const coverImage = imageUrl(doc.coverImage)
  const finalImages = images.length ? images : (coverImage ? [coverImage] : [])

  return {
    id: String(doc.id),
    opportunityType,
    title: stringValue(doc.title),
    city: stringValue(doc.city),
    district: stringValue(doc.district),
    addressText: stringValue(doc.addressText),
    schoolName: stringValue(doc.schoolName),
    schoolAlias: stringValue(doc.schoolAlias),
    showFullSchoolName: booleanValue(doc.showFullSchoolName),
    projectType: stringValue(doc.projectType),
    areaText: stringValue(doc.areaText),
    feeText: stringValue(doc.feeText),
    suitableBusiness: toArrayItems(doc.suitableBusiness),
    unsuitableBusiness: toArrayItems(doc.unsuitableBusiness),
    highlights: toArrayItems(doc.highlights),
    trafficTags: toArrayItems(doc.trafficTags),
    facilityTags: toArrayItems(doc.facilityTags),
    advisorTips: stringValue(doc.advisorTips),
    customerInfo: stringValue(doc.customerInfo),
    cooperationMode: stringValue(doc.cooperationMode),
    viewingTimeText: stringValue(doc.viewingTimeText),
    coverImage: coverImage || finalImages[0],
    images: finalImages,
    transferInfo: mapTransferInfo(doc.transferInfo),
    status: stringValue(doc.status) || 'draft',
    auditStatus: stringValue(doc.auditStatus) || 'approved',
    isRecommended: booleanValue(doc.isRecommended),
    sort: numberValue(doc.sort),
    remark: stringValue(doc.remark),
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
  }
}

export async function mapLead(doc: Doc) {
  const payload = await getPayloadInstance()
  const follows = await payload.find({
    collection: 'follow-records',
    where: { lead: { equals: doc.id } },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  return {
    id: String(doc.id),
    submitterOpenId: stringValue(doc.submitterOpenId),
    leadType: stringValue(doc.leadType) || 'leasing',
    sourceChannel: stringValue(doc.sourceChannel) || 'mini_program',
    name: stringValue(doc.name),
    phone: stringValue(doc.phone),
    businessType: stringValue(doc.businessType),
    budgetRange: stringValue(doc.budgetRange),
    regionPreference: stringValue(doc.regionPreference),
    hasCampusExperience: booleanValue(doc.hasCampusExperience),
    transferDetails: mapTransferDetails(doc.transferDetails),
    equipmentDetails: mapEquipmentDetails(doc.equipmentDetails),
    attachments: Array.isArray(doc.attachments) ? doc.attachments.map(item => {
      if (item && typeof item === 'object') return mapMedia(item as Doc)
      return { id: String(item), url: undefined }
    }) : [],
    remark: stringValue(doc.remark),
    status: stringValue(doc.status) || 'new',
    projectId: relationId(doc.project),
    projectTitle: stringValue(doc.projectTitle) || relationTitle(doc.project) || '',
    owner: stringValue(doc.owner),
    nextFollowAt: doc.nextFollowAt ? toTimestamp(doc.nextFollowAt) : undefined,
    closedAmount: doc.closedAmount,
    lostReason: stringValue(doc.lostReason),
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
    follows: follows.docs.map(follow => mapFollow(follow as Doc)),
  }
}

export function mapFollow(doc: Doc) {
  return {
    id: String(doc.id),
    leadId: relationId(doc.lead),
    content: stringValue(doc.content),
    nextFollowAt: doc.nextFollowAt ? toTimestamp(doc.nextFollowAt) : undefined,
    operatorName: stringValue(doc.operatorName),
    createdAt: toTimestamp(doc.createdAt),
  }
}

export function getProjectBudgetCategory(project: { feeText?: unknown }) {
  const text = typeof project.feeText === 'string' ? project.feeText : ''
  if (text.includes('面议') || text.includes('扣点') || text.includes('抽成')) return '面议'

  const match = text.match(/([\d.]+)/)
  if (!match) return '面议'

  const val = Number.parseFloat(match[1])
  const yearly = text.includes('月') ? val * 12 : val
  if (yearly < 5) return '5万以内'
  if (yearly <= 10) return '5-10万'
  if (yearly <= 20) return '10-20万'
  if (yearly <= 50) return '20-50万'
  return '50万以上'
}

export function sanitizeProjectInput(input: Record<string, unknown>) {
  return {
    opportunityType: input.opportunityType || 'leasing',
    title: input.title,
    city: input.city,
    district: input.district,
    addressText: input.addressText,
    schoolName: input.schoolName,
    schoolAlias: input.schoolAlias,
    showFullSchoolName: booleanValue(input.showFullSchoolName),
    projectType: input.projectType,
    areaText: input.areaText,
    feeText: input.feeText,
    suitableBusiness: fromArrayItems(input.suitableBusiness),
    unsuitableBusiness: fromArrayItems(input.unsuitableBusiness),
    highlights: fromArrayItems(input.highlights),
    trafficTags: fromArrayItems(input.trafficTags),
    facilityTags: fromArrayItems(input.facilityTags),
    advisorTips: input.advisorTips,
    customerInfo: input.customerInfo,
    cooperationMode: input.cooperationMode,
    viewingTimeText: input.viewingTimeText,
    transferInfo: input.transferInfo,
    status: input.status || 'draft',
    auditStatus: input.auditStatus || 'approved',
    isRecommended: booleanValue(input.isRecommended),
    sort: Number.parseInt(String(input.sort || 0), 10) || 0,
    remark: input.remark,
  }
}

export function sanitizeLeadInput(input: Record<string, unknown>, submitterOpenId?: string) {
  return {
    submitterOpenId: submitterOpenId || input.submitterOpenId,
    leadType: input.leadType || 'leasing',
    sourceChannel: input.sourceChannel || 'mini_program',
    name: input.name,
    phone: input.phone,
    businessType: input.businessType,
    budgetRange: input.budgetRange,
    regionPreference: input.regionPreference,
    hasCampusExperience: booleanValue(input.hasCampusExperience),
    transferDetails: input.transferDetails,
    equipmentDetails: input.equipmentDetails,
    attachments: ids(input.attachments),
    remark: input.remark,
    status: input.status || 'new',
    project: toDatabaseId(input.project || input.projectId),
    owner: input.owner,
    nextFollowAt: input.nextFollowAt ? new Date(Number(input.nextFollowAt)).toISOString() : undefined,
    closedAmount: input.closedAmount,
    lostReason: input.lostReason,
  }
}
