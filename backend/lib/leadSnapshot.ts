/** Frozen copy of the customer's first submission for staff reference. */

export type LeadSnapshot = {
  capturedAt: string
  name?: string
  phone?: string
  leadType?: string
  sourceChannel?: string
  businessType?: string
  budgetRange?: string
  regionPreference?: string
  hasCampusExperience?: boolean
  remark?: string
  projectId?: string | number | null
  transferDetails?: Record<string, unknown>
  equipmentDetails?: Record<string, unknown>
  renovationDetails?: Record<string, unknown>
  attachmentIds?: (string | number)[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function relationId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return null
}

function attachmentIds(value: unknown): (string | number)[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => relationId(item))
    .filter((id): id is string | number => id !== null)
}

/** Build a snapshot from lead-like field values (create body or existing doc). */
export function buildLeadSnapshot(source: Record<string, unknown>, capturedAt = new Date().toISOString()): LeadSnapshot {
  const transfer = asRecord(source.transferDetails)
  const equipment = asRecord(source.equipmentDetails)
  const renovation = asRecord(source.renovationDetails)

  return {
    capturedAt,
    name: typeof source.name === 'string' ? source.name : '',
    phone: typeof source.phone === 'string' ? source.phone : '',
    leadType: typeof source.leadType === 'string' ? source.leadType : 'leasing',
    sourceChannel: typeof source.sourceChannel === 'string' ? source.sourceChannel : 'mini_program',
    businessType: typeof source.businessType === 'string' ? source.businessType : '',
    budgetRange: typeof source.budgetRange === 'string' ? source.budgetRange : '',
    regionPreference: typeof source.regionPreference === 'string' ? source.regionPreference : '',
    hasCampusExperience: Boolean(source.hasCampusExperience),
    remark: typeof source.remark === 'string' ? source.remark : '',
    projectId: relationId(source.project ?? source.projectId),
    transferDetails: Object.keys(transfer).length ? transfer : undefined,
    equipmentDetails: Object.keys(equipment).length ? equipment : undefined,
    renovationDetails: Object.keys(renovation).length ? renovation : undefined,
    attachmentIds: attachmentIds(source.attachments),
  }
}

export function isLeadSnapshot(value: unknown): value is LeadSnapshot {
  return Boolean(value && typeof value === 'object' && 'capturedAt' in (value as object))
}
