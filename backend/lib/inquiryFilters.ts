import type { Where } from 'payload'

// Date inputs represent whole calendar days in China, independent of server timezone.
function dayStart(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('请选择有效日期')
  const utc = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== value) {
    throw new Error('请选择有效日期')
  }
  return utc - 8 * 60 * 60 * 1000
}

export function inquiryTimeFilters(params: URLSearchParams): { where: Where[]; sort: string[] } {
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const order = params.get('sort') || 'desc'
  if (!['asc', 'desc'].includes(order)) throw new Error('请选择有效的时间排序')
  const start = from ? dayStart(from) : undefined
  const end = to ? dayStart(to) : undefined
  if (start !== undefined && end !== undefined && start > end) throw new Error('开始日期不能晚于结束日期')
  const where: Where[] = []
  if (start !== undefined) where.push({ createdAt: { greater_than_equal: new Date(start).toISOString() } })
  if (end !== undefined) where.push({ createdAt: { less_than: new Date(end + 86400000).toISOString() } })
  return { where, sort: order === 'asc' ? ['createdAt', 'id'] : ['-createdAt', '-id'] }
}
