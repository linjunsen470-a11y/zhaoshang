import commercialOptions from '../../../collections/shared/commercialOptions.json'
import { relationIds, toDatabaseId } from './relationIds'
export const MINI_PROGRAM_LEAD_TYPES = [
  'leasing',
  'transfer',
  'equipment_sell',
  'equipment_buy',
  'equipment_recycle',
  'renovation_consult',
]

type StableLeadFields = {
  [key: string]: unknown
  leadType?: unknown
  sourceChannel?: unknown
  project?: unknown
  businessScene?: unknown
  transferDetails?: unknown
  equipmentDetails?: unknown
  renovationDetails?: unknown
  businessType?: unknown
  budgetRange?: unknown
  regionPreference?: unknown
  attachments?: unknown
  equipmentPublication?: { status?: string | null; publicRemark?: string | null } | null
}

function sanitizeLeadUserFields(
  input: Record<string, unknown>,
  submitterOpenId: string,
  stable?: StableLeadFields,
) {
  const transferFields = ['locationText', 'feeText', 'transferFee', 'remainingTerm', 'includesEquipment']
  const equipmentFields = ['equipmentName', 'specText', 'equipmentCondition', 'expectedPrice']
  const renovationFields = ['shopArea', 'renovationType', 'designStyle', 'budgetText', 'expectedStartDate']
  const mergeGroup = (key: 'transferDetails' | 'equipmentDetails' | 'renovationDetails', fields: string[]) => {
    const incoming = pickGroup(input[key], fields)
    if (!incoming) return undefined
    return stable ? { ...pickGroup(stable[key], fields), ...incoming } : incoming
  }
  const transferDetails = mergeGroup('transferDetails', transferFields)
  if (!stable && transferDetails && transferDetails.includesEquipment === undefined) transferDetails.includesEquipment = null
  return {
    submitterOpenId,
    leadType: stable?.leadType || input.leadType || 'leasing',
    sourceChannel: stable?.sourceChannel || 'mini_program',
    name: typeof input.name === 'string' ? input.name.trim() || null : input.name,
    phone: input.phone,
    businessType: input.businessType,
    businessScene: stable?.project ? stable.businessScene : (input.businessScene === undefined && stable ? undefined : input.businessScene || null),
    budgetRange: input.budgetRange,
    regionPreference: input.regionPreference,
    hasCampusExperience: input.hasCampusExperience === undefined ? (stable ? undefined : null) : input.hasCampusExperience,
    transferDetails,
    equipmentDetails: mergeGroup('equipmentDetails', equipmentFields),
    renovationDetails: mergeGroup('renovationDetails', renovationFields),
    attachments: relationIds(input.attachments),
    remark: input.remark,
    project: stable ? toDatabaseId(stable.project) : toDatabaseId(input.project || input.projectId),
  }
}

function pickGroup(value: unknown, fields: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const group = value as Record<string, unknown>
  return Object.fromEntries(fields.filter(key => group[key] !== undefined).map(key => [key, group[key]]))
}

export function sanitizeLeadCreateInput(input: Record<string, unknown>, submitterOpenId: string) {
  return {
    ...sanitizeLeadUserFields(input, submitterOpenId),
    status: 'new',
  }
}

export function sanitizeLeadUpdateInput(
  input: Record<string, unknown>,
  submitterOpenId: string,
  stable: StableLeadFields,
) {
  const data = sanitizeLeadUserFields(input, submitterOpenId, stable)
  const textChanged = (['businessType', 'budgetRange', 'regionPreference'] as const).some(key => (
    data[key] !== undefined && String(data[key] || '') !== String(stable[key] || '')
  ))
  const oldDetails = pickGroup(stable.equipmentDetails, ['equipmentName', 'specText', 'equipmentCondition', 'expectedPrice']) || {}
  const detailsChanged = data.equipmentDetails && Object.entries(data.equipmentDetails).some(([key, value]) => (
    String(value || '') !== String(oldDetails[key] || '')
  ))
  const attachmentsChanged = data.attachments !== undefined
    && JSON.stringify(data.attachments.map(String)) !== JSON.stringify((relationIds(stable.attachments) || []).map(String))
  // Only changes to the public listing require review; contact/private notes do not.
  const needsReview = stable.equipmentPublication?.status === 'online' && (textChanged || detailsChanged || attachmentsChanged)
  return {
    ...data,
    ...(needsReview ? { equipmentPublication: { ...stable.equipmentPublication, status: 'draft' as const } } : {}),
  }
}

const LEAD_TEXT_LIMITS: Record<string, number> = {
  name: 20,
  phone: 11,
  businessType: 100,
  budgetRange: 100,
  regionPreference: 50,
  remark: 500,
}

const LEAD_GROUP_LIMITS: Record<string, number> = {
  locationText: 100,
  feeText: 100,
  transferFee: 100,
  remainingTerm: 100,
  equipmentName: 100,
  specText: 100,
  equipmentCondition: 100,
  expectedPrice: 100,
  shopArea: 100,
  renovationType: 100,
  designStyle: 100,
  budgetText: 100,
  expectedStartDate: 100,
}

export function validateLeadUserInput(input: Record<string, unknown>): string | null {
  if (input.name !== undefined && typeof input.name !== 'string') return '称呼格式无效'
  if (input.hasCampusExperience !== undefined && typeof input.hasCampusExperience !== 'boolean') return '校园经营经验格式无效'
  if (input.businessScene && !commercialOptions.scenes.some(item => item.value === input.businessScene)) return '意向场景无效'
  for (const [key, limit] of Object.entries(LEAD_TEXT_LIMITS)) {
    const value = input[key]
    if (value !== undefined && typeof value !== 'string') return `${key} 格式无效`
    if (typeof value === 'string' && value.length > limit) return `${key} 内容过长`
  }

  if (input.phone !== undefined && !/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return '手机号格式不正确'
  }
  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments)) return '附件格式无效'
    if (input.attachments.length > 6) return '最多上传 6 张图片'
    if (input.attachments.some(value => {
      const id = toDatabaseId(value)
      return typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0
    })) return '附件编号无效'
  }

  for (const groupName of ['transferDetails', 'equipmentDetails', 'renovationDetails']) {
    const group = input[groupName]
    if (group === undefined) continue
    if (!group || typeof group !== 'object' || Array.isArray(group)) return `${groupName} 格式无效`
    for (const [key, limit] of Object.entries(LEAD_GROUP_LIMITS)) {
      const value = (group as Record<string, unknown>)[key]
      if (value !== undefined && typeof value !== 'string') {
        return `${groupName}.${key} 格式无效`
      }
      if (typeof value === 'string' && value.length > limit) return `${groupName}.${key} 内容过长`
    }
    const includesEquipment = (group as Record<string, unknown>).includesEquipment
    if (includesEquipment !== undefined && typeof includesEquipment !== 'boolean') return `${groupName}.includesEquipment 格式无效`
  }

  return null
}


export function validateLeadCreateRequirements(input: Record<string, unknown>): string | null {
  const leadType = String(input.leadType || 'leasing')
  const details = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  if (leadType === 'transfer' && !String(details(input.transferDetails).locationText || '').trim()) return '请填写店铺所在城市或区域'
  if (['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(leadType) && !String(details(input.equipmentDetails).equipmentName || '').trim()) return '请填写设备名称'
  return null
}
