export const CITY_OPTIONS = [
  { label: '广州', value: '广州' },
]

export const DISTRICT_OPTIONS = [
  { label: '天河', value: '天河' },
  { label: '番禺', value: '番禺' },
  { label: '增城', value: '增城' },
  { label: '白云', value: '白云' },
  { label: '黄埔', value: '黄埔' },
  { label: '从化', value: '从化' },
]

export const PROJECT_TYPE_OPTIONS = [
  { label: '食堂档口', value: '食堂档口' },
  { label: '校园商业街', value: '校园商业街' },
  { label: '校内铺位', value: '校内铺位' },
  { label: '校外临校铺位', value: '校外临校铺位' },
  { label: '校园服务点', value: '校园服务点' },
  { label: '店铺转让', value: '店铺转让' },
  { label: '其他', value: '其他' },
]

export const BUSINESS_TYPE_OPTIONS = [
  { label: '快餐', value: '快餐' },
  { label: '粉面', value: '粉面' },
  { label: '小吃', value: '小吃' },
  { label: '奶茶', value: '奶茶' },
  { label: '咖啡', value: '咖啡' },
  { label: '便利店', value: '便利店' },
  { label: '水果', value: '水果' },
  { label: '文具', value: '文具' },
  { label: '打印', value: '打印' },
  { label: '快递', value: '快递' },
  { label: '维修', value: '维修' },
  { label: '洗衣', value: '洗衣' },
  { label: '其他', value: '其他' },
]

export const ADMIN_GROUPS = {
  operations: '业务运营',
  customers: '客户资产',
  system: '系统设置',
} as const

export const LEAD_STATUS_OPTIONS = [
  { label: '新线索', value: 'new', tone: '#3b82f6' },
  { label: '已联系', value: 'contacted', tone: '#10b981' },
  { label: '意向明确', value: 'interested', tone: '#8b5cf6' },
  { label: '已约看铺', value: 'viewing_scheduled', tone: '#f59e0b' },
  { label: '已看铺/已核实', value: 'viewed', tone: '#f97316' },
  { label: '谈判中', value: 'negotiating', tone: '#ec4899' },
  { label: '已成交', value: 'closed', tone: '#059669' },
  { label: '无效', value: 'invalid', tone: '#64748b' },
  { label: '暂缓', value: 'paused', tone: '#94a3b8' },
] as const

export const LEAD_KANBAN_COLUMNS = LEAD_STATUS_OPTIONS.filter(
  item => !['invalid', 'paused'].includes(item.value),
)

export const LEAD_TYPE_LABELS: Record<string, string> = {
  leasing: '找铺咨询',
  transfer: '店铺转让',
  equipment_sell: '设备出售',
  equipment_buy: '设备求购',
  equipment_recycle: '设备回收',
  brand_cooperation: '品牌合作',
  renovation_consult: '装修咨询',
}