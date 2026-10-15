import commercialOptions from './commercialOptions.json'

export const CITY_OPTIONS = [
  { label: '广州', value: '广州' },
]

export const DISTRICT_OPTIONS = commercialOptions.districts.map(value => ({ label: value, value }))
export const BUSINESS_SCENE_OPTIONS = commercialOptions.scenes
export const LISTING_KIND_OPTIONS = commercialOptions.kinds

export const PROJECT_TYPE_OPTIONS = [
  { label: '食堂档口', value: '食堂档口' },
  { label: '校园商业街', value: '校园商业街' },
  { label: '校内铺位', value: '校内铺位' },
  { label: '校外临校铺位', value: '校外临校铺位' },
  { label: '校园服务点', value: '校园服务点' },
  { label: '店铺转让', value: '店铺转让' },
  { label: '其他', value: '其他' },
]

export const BUSINESS_TYPE_OPTIONS = commercialOptions.businesses.map(value => ({ label: value, value }))

export const ADMIN_GROUPS = {
  properties: '项目与铺位',
  inquiries: '咨询与供需',
  system: '系统设置',
} as const

export const LEAD_STATUS_OPTIONS = [
  { label: '待联系', value: 'new', tone: '#1d4ed8' },
  { label: '已联系', value: 'contacted', tone: '#047857' },
  { label: '已结束', value: 'closed', tone: '#64748b' },
] as const

export const LEAD_STATUS_HELP = '待联系：尚未联系；已联系：已沟通、继续跟进；已结束：不再跟进，不代表已成交。'
export const PROPERTY_STATUS_HELP = '草稿、已下架不公开；开放中、即将开放、已满/已转会在小程序展示。选择状态后点击保存才生效。'

export const OPPORTUNITY_TYPE_OPTIONS = [
  { label: '招商（出租）', value: 'leasing' },
  { label: '店铺转让', value: 'transfer' },
] as const

export const PROPERTY_STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '开放中', value: 'online' },
  { label: '即将开放', value: 'coming' },
  { label: '已满/已转', value: 'full' },
  { label: '已下架', value: 'offline' },
] as const

export const EQUIPMENT_PUBLICATION_OPTIONS = [
  { label: '未发布', value: 'draft' },
  { label: '已发布', value: 'online' },
  { label: '已下架', value: 'offline' },
] as const

export const LEAD_TYPE_LABELS: Record<string, string> = {
  leasing: '找铺咨询',
  transfer: '店铺转让',
  equipment_sell: '设备出售',
  equipment_buy: '设备求购',
  equipment_recycle: '设备回收',
  brand_cooperation: '品牌合作',
  renovation_consult: '装修咨询',
}

/** Inbox category buckets used by PrimaryNav + inquiry workspace. */
export const LEAD_CATEGORY_OPTIONS = [
  {
    value: 'property',
    label: '房源咨询',
    description: '找铺、转让、品牌合作',
    types: ['leasing', 'transfer', 'brand_cooperation'] as const,
    live: true,
  },
  {
    value: 'equipment',
    label: '设备咨询',
    description: '出售 / 求购 / 回收',
    types: ['equipment_sell', 'equipment_buy', 'equipment_recycle'] as const,
    live: true,
  },
  {
    value: 'renovation',
    label: '装修咨询',
    description: '小程序已可提交，后台按收件处理',
    types: ['renovation_consult'] as const,
    live: true,
  },
] as const

export type LeadCategory = (typeof LEAD_CATEGORY_OPTIONS)[number]['value']

export function leadTypesForCategory(category: string | null | undefined): string[] | null {
  if (!category || category === 'all') return null
  const found = LEAD_CATEGORY_OPTIONS.find(item => item.value === category)
  return found ? [...found.types] : null
}

export function categoryForLeadType(leadType: string | null | undefined): LeadCategory | '' {
  if (!leadType) return ''
  const found = LEAD_CATEGORY_OPTIONS.find(item => (item.types as readonly string[]).includes(leadType))
  return found?.value || ''
}
