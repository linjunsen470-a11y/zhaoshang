export const REQUIRED_PROJECT_FIELDS = [
  { key: 'title', label: '房源标题' },
  { key: 'coverImage', label: '封面图' },
  { key: 'projectType', label: '房源类型' },
  { key: 'district', label: '区域' },
  { key: 'feeText', label: '费用说明' },
  { key: 'customerInfo', label: '客群说明' },
  { key: 'images', label: '详情图片' },
]

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

export function getProjectMissingFields(data) {
  return REQUIRED_PROJECT_FIELDS.filter(field => !hasValue(data[field.key])).map(field => field.label)
}

export function simplifyInquiryStatus(status) {
  if (status === 'new') return 'new'
  if (['contacted', 'interested', 'viewing_scheduled', 'viewed', 'negotiating'].includes(status)) return 'contacted'
  return 'closed'
}
