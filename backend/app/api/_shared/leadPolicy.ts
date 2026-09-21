export const MINI_PROGRAM_LEAD_TYPES = [
  'leasing',
  'transfer',
  'equipment_sell',
  'equipment_buy',
  'equipment_recycle',
  'renovation_consult',
]

function booleanValue(value: unknown) {
  return Boolean(value)
}

function toDatabaseId(value: unknown): string | number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = Number(value)
    return Number.isNaN(num) ? value : num
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return toDatabaseId((value as { id: unknown }).id)
  }
  return undefined
}

function ids(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value.map(toDatabaseId).filter(Boolean) as (string | number)[]
}

function sanitizeLeadUserFields(
  input: Record<string, unknown>,
  submitterOpenId: string,
  stable?: { leadType?: unknown; sourceChannel?: unknown },
) {
  return {
    submitterOpenId,
    leadType: stable?.leadType || input.leadType || 'leasing',
    sourceChannel: stable?.sourceChannel || input.sourceChannel || 'mini_program',
    name: input.name,
    phone: input.phone,
    businessType: input.businessType,
    budgetRange: input.budgetRange,
    regionPreference: input.regionPreference,
    hasCampusExperience: booleanValue(input.hasCampusExperience),
    transferDetails: input.transferDetails,
    equipmentDetails: input.equipmentDetails,
    renovationDetails: input.renovationDetails,
    attachments: ids(input.attachments),
    remark: input.remark,
    project: toDatabaseId(input.project || input.projectId),
  }
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
  stable: { leadType?: unknown; sourceChannel?: unknown },
) {
  return sanitizeLeadUserFields(input, submitterOpenId, stable)
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
  for (const [key, limit] of Object.entries(LEAD_TEXT_LIMITS)) {
    const value = input[key]
    if (value !== undefined && typeof value !== 'string') return `${key} 格式无效`
    if (typeof value === 'string' && value.trim().length > limit) return `${key} 内容过长`
  }

  if (input.phone !== undefined && !/^1[3-9]\d{9}$/.test(String(input.phone))) {
    return '手机号格式不正确'
  }
  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments)) return '附件格式无效'
    if (input.attachments.length > 6) return '最多上传 6 张图片'
  }

  for (const groupName of ['transferDetails', 'equipmentDetails', 'renovationDetails']) {
    const group = input[groupName]
    if (group === undefined) continue
    if (!group || typeof group !== 'object' || Array.isArray(group)) return `${groupName} 格式无效`
    for (const [key, limit] of Object.entries(LEAD_GROUP_LIMITS)) {
      const value = (group as Record<string, unknown>)[key]
      if (value !== undefined && typeof value !== 'string' && typeof value !== 'boolean') {
        return `${groupName}.${key} 格式无效`
      }
      if (typeof value === 'string' && value.trim().length > limit) return `${groupName}.${key} 内容过长`
    }
  }

  return null
}
