import { commercialScene, commercialIsPublic } from '../../../lib/commercial'
import { publicCampusLabel, redactPublicProject, scrubSchoolText } from '../../../lib/publicSchool'
import config from '@/payload.config'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import { relationIds } from './relationIds'
import { signMediaToken } from './tokens'

export {
  MINI_PROGRAM_LEAD_TYPES,
  sanitizeLeadCreateInput,
  sanitizeLeadUpdateInput,
  validateLeadUserInput,
} from './leadPolicy'

export const ALL = '全部'
export const PUBLIC_STATUSES = ['online', 'coming', 'full']
export const PUBLIC_EQUIPMENT_LEAD_TYPES = ['equipment_sell', 'equipment_buy', 'equipment_recycle']
export const LEAD_ID_OFFSET = 26000000


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
}

function publicBaseUrl() {
  return (process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
}

export function absoluteUrl(url: string) {

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

export function mapMedia(doc: Doc) {
  const privateImage = doc.source === 'lead_attachment' && typeof doc.ownerOpenId === 'string' && doc.ownerOpenId
  return {
    id: String(doc.id),
    url: privateImage
      ? absoluteUrl(`/api/uploads/lead-image/${doc.id}?token=${encodeURIComponent(signMediaToken(String(doc.id), String(doc.ownerOpenId)))}`)
      : imageUrl(doc),
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

function mapRenovationDetails(value: unknown) {
  const details = objectValue(value)
  return {
    shopArea: stringValue(details.shopArea),
    renovationType: stringValue(details.renovationType),
    designStyle: stringValue(details.designStyle),
    budgetText: stringValue(details.budgetText),
    expectedStartDate: stringValue(details.expectedStartDate),
  }
}

export function mapProject(doc: Doc, isStaff = false) {
  const opportunityType = doc.opportunityType === 'transfer' ? 'transfer' : 'leasing'
  const images = Array.isArray(doc.images) ? doc.images.map(imageUrl).filter(Boolean) : []
  const coverImage = imageUrl(doc.coverImage)
  const finalImages = images.length ? images : (coverImage ? [coverImage] : [])

  const mapped = {
    id: String(doc.id),
    ...(isStaff ? { sourceManaged: String(doc.seedKey || '').startsWith('tencent:'), emergencyHidden: doc.emergencyHidden === true } : {}),
    opportunityType,
    listingKind: doc.listingKind === 'project' ? 'project' : 'unit',
    businessScene: commercialScene(doc),
    venueName: stringValue(doc.venueName),
    unitLocation: stringValue(doc.unitLocation),
    areaMin: typeof doc.areaMin === 'number' ? doc.areaMin : null,
    areaMax: typeof doc.areaMax === 'number' ? doc.areaMax : null,
    monthlyRentMin: typeof doc.monthlyRentMin === 'number' ? doc.monthlyRentMin : null,
    monthlyRentMax: typeof doc.monthlyRentMax === 'number' ? doc.monthlyRentMax : null,
    premisesConditions: stringValue(doc.premisesConditions),
    introduction: stringValue(doc.introduction),
    operatingRequirements: stringValue(doc.operatingRequirements),
    parentProject: (() => {
      const parent = objectValue(doc.parentProject)
      if (!(parent.id && (isStaff || commercialIsPublic(parent)))) return null
      const title = stringValue(parent.title)
      return { id: String(parent.id), title: isStaff ? title : scrubSchoolText(title, parent), status: stringValue(parent.status) }
    })(),
    placeLabel: commercialScene(doc) === 'campus'
      ? publicCampusLabel(doc.city, doc.district)
      : stringValue(doc.venueName) || stringValue(doc.district),
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
    customerInfo: stringValue(doc.customerInfo),
    cooperationMode: stringValue(doc.cooperationMode),
    viewingTimeText: stringValue(doc.viewingTimeText),
    coverImage: coverImage || finalImages[0],
    images: finalImages,
    transferInfo: mapTransferInfo(doc.transferInfo),
    status: stringValue(doc.status) || 'draft',
    isRecommended: booleanValue(doc.isRecommended),
    sort: numberValue(doc.sort),
    remark: isStaff ? stringValue(doc.remark) : '',
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
  }
  return isStaff ? mapped : redactPublicProject(mapped, doc)
}

export function isPublicProject(doc: Record<string, unknown>) {
  return commercialIsPublic(doc)
}


export async function mapLeads(docs: Doc[]) {
  return docs.map(doc => ({
      id: (() => {
        const num = Number(doc.id)
        if (!isNaN(num) && num < 10000000) {
          return String(LEAD_ID_OFFSET + num)
        }
        return String(doc.id)
      })(),

      leadType: stringValue(doc.leadType) || 'leasing',
      sourceChannel: stringValue(doc.sourceChannel) || 'mini_program',
      name: stringValue(doc.name),
      phone: stringValue(doc.phone),
      businessType: stringValue(doc.businessType),
      businessScene: stringValue(doc.businessScene),
      budgetRange: stringValue(doc.budgetRange),
      regionPreference: stringValue(doc.regionPreference),
      hasCampusExperience: booleanValue(doc.hasCampusExperience),
      transferDetails: mapTransferDetails(doc.transferDetails),
      equipmentDetails: mapEquipmentDetails(doc.equipmentDetails),
      renovationDetails: mapRenovationDetails(doc.renovationDetails),
      attachments: Array.isArray(doc.attachments) ? doc.attachments.map(item => {
        if (item && typeof item === 'object') return mapMedia(item as Doc)
        return { id: String(item), url: undefined }
      }) : [],
      remark: stringValue(doc.remark),
      status: stringValue(doc.status) || 'new',
      projectId: relationId(doc.project),
      projectTitle: scrubSchoolText(stringValue(doc.projectTitle) || relationTitle(doc.project) || '', objectValue(doc.project)),
      createdAt: toTimestamp(doc.createdAt),
      updatedAt: toTimestamp(doc.updatedAt),
    }))
}

export async function mapLead(doc: Doc) {
  const mapped = await mapLeads([doc])
  return mapped[0]
}


export function sanitizeProjectInput(input: Record<string, unknown>) {
  return {
    ...(typeof input.emergencyHidden === 'boolean' ? { emergencyHidden: input.emergencyHidden } : {}),
    ...Object.fromEntries(['listingKind', 'businessScene', 'parentProject', 'venueName', 'unitLocation', 'areaMin', 'areaMax', 'monthlyRentMin', 'monthlyRentMax', 'premisesConditions', 'introduction', 'operatingRequirements', 'coverImage', 'images'].filter(key => input[key] !== undefined).map(key => [key, input[key]])),
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
    customerInfo: input.customerInfo,
    cooperationMode: input.cooperationMode,
    viewingTimeText: input.viewingTimeText,
    transferInfo: input.transferInfo,
    status: input.status || 'draft',
    isRecommended: booleanValue(input.isRecommended),
    sort: Number.parseInt(String(input.sort || 0), 10) || 0,
    remark: input.remark,
  }
}

export async function validateAttachmentOwnership(
  attachmentIds: unknown,
  ownerOpenId: string,
): Promise<Response | null> {
  const normalized = relationIds(attachmentIds)
  if (!normalized?.length) return null

  const payload = await getPayloadInstance()
  for (const rawId of normalized) {
    try {
      const media = await payload.findByID({
        collection: 'media',
        id: rawId,
        overrideAccess: true,
      })
      const owner = typeof media?.ownerOpenId === 'string' ? media.ownerOpenId : ''
      const source = typeof media?.source === 'string' ? media.source : ''
      if (source !== 'lead_attachment' || !owner || owner !== ownerOpenId) {
        return json({ error: '无权使用该附件' }, 403)
      }
    } catch {
      return json({ error: '附件不存在' }, 400)
    }
  }

  return null
}

/** Keep files referenced by either a working copy or an immutable original. */
export async function deleteOwnedOrphanAttachments(
  attachmentIds: (string | number)[],
  ownerOpenId: string,
) {
  if (!attachmentIds.length) return
  const payload = await getPayloadInstance()
  const originalIds = new Set<string>()
  let page = 1
  while (true) {
    const originals = await payload.find({
      collection: 'leads',
      where: { submitterOpenId: { equals: ownerOpenId } },
      select: { customerSnapshot: true },
      page,
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    for (const lead of originals.docs) {
      const snapshot = objectValue(lead.customerSnapshot)
      if (Array.isArray(snapshot.attachmentIds)) snapshot.attachmentIds.forEach(id => originalIds.add(String(id)))
    }
    if (!originals.hasNextPage) break
    page += 1
  }

  for (const id of attachmentIds) {
    if (originalIds.has(String(id))) continue
    try {
      const references = await payload.find({
        collection: 'leads',
        where: { attachments: { contains: id } } as Where,
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (references.totalDocs > 0) continue
      const projects = await payload.count({
        collection: 'projects',
        where: { or: [{ coverImage: { equals: id } }, { images: { contains: id } }] } as Where,
        overrideAccess: true,
      })
      if (projects.totalDocs > 0) continue

      const media = await payload.findByID({ collection: 'media', id, overrideAccess: true })
      if (media.source !== 'lead_attachment' || media.ownerOpenId !== ownerOpenId) continue
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    } catch (error) {
      console.error('[deleteOwnedOrphanAttachments]', { mediaId: String(id), error })
    }
  }
}

export function maskPublicRegion(value: unknown) {
  const text = stringValue(value).trim()
  if (!text) return ''
  if (text.length <= 10) return text
  return `${text.slice(0, 10)}…`
}

export function truncatePublicText(value: unknown, max = 80) {
  const text = stringValue(value).trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}
