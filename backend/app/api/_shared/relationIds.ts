/** Accept either a relation ID or a populated Payload relation. */
export function toDatabaseId(value: unknown): string | number | undefined {
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

export function relationIds(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value.map(toDatabaseId).filter(Boolean) as (string | number)[]
}
