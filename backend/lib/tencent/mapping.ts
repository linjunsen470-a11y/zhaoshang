import { createHash } from 'node:crypto'
import options from '../../collections/shared/commercialOptions.json'
import { LEAD_TYPE_LABELS, LEAD_STATUS_OPTIONS } from '../../collections/shared/fieldOptions'

export type Cell = { field?: string; text_value?: { items?: { text?: string; type?: string }[] }; option_value?: { items?: { text?: string }[] }; number_value?: number; string_value?: string; auto_number_value?: { text?: string }; image_value?: { items?: { image_url?: string; image_id?: string }[] } }
export type SheetRecord = { record_id: string; field_values?: Cell[] }

export function cellValue(record: SheetRecord, field: string): string {
  const cell = record.field_values?.find(value => value.field === field)
  if (!cell) return ''
  return cell.text_value?.items?.map(item => item.text || '').join('')
    ?? cell.option_value?.items?.map(item => item.text || '').join('、')
    ?? cell.auto_number_value?.text ?? cell.string_value
    ?? (typeof cell.number_value === 'number' ? String(cell.number_value) : '')
}

export function textCell(field: string, text: unknown): Cell {
  return { field, text_value: { items: [{ type: 'text', text: String(text ?? '') }] } }
}

export function contentHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function mapProperty(record: SheetRecord) {
  const value = (field: string) => cellValue(record, field).trim()
  const numeric = (field: string) => value(field) === '' ? undefined : Number(value(field))
  const number = (field: string) => {
    const n = numeric(field)
    if (n !== undefined && (!Number.isFinite(n) || n < 0)) throw new Error(`${field}：必须是非负数字`)
    return n
  }
  const city = value('城市').replace(/市$/, '')
  const regions = (options.regionsByCity as Record<string, string[]>)[city]
  if (!regions) throw new Error('城市：不在广东省地区字典中')
  const rawDistrict = value('行政区')
  const district = regions.find(name => name === rawDistrict || [name + '区', name + '镇', name + '街道'].includes(rawDistrict) || name.replace(/(?:市|县)$/, '') === rawDistrict)
  if (!district) throw new Error(`行政区：${rawDistrict} 不属于 ${city} 或尚未配置`)

  const venue = value('场所名称')
  const location = value('校区/位置')
  if (!venue || !location) throw new Error('缺少场所名称或位置')
  const sceneInput = value('场景')
  if (sceneInput && !['学校', '校园', '校园商铺', '工业园区', '写字楼'].includes(sceneInput)) throw new Error('场景应为学校、工业园区或写字楼')
  if (!sceneInput) throw new Error('场景：必须明确选择学校、工业园区或写字楼')
  const businessScene = sceneInput === '工业园区' ? 'industrial_park' : sceneInput === '写字楼' ? 'office' : 'campus'
  const area = number('商铺面积（㎡）')
  const rent = number('租金')
  const unit = value('租金单位')
  const feeParts = [rent === undefined ? '租金面议' : `基础租金 ${rent}${unit || '（单位待核实）'}`]
  for (const [field, label, suffix] of [['抽成比例（%）', '营业额抽成', '%（与租金的结算关系待核实）'], ['进场费（元）', '进场费', '元'], ['押金（元）', '押金', '元'], ['物业费（元/月）', '物业费', '元/月']]) {
    const amount = number(field)
    if (amount !== undefined) feeParts.push(`${label} ${amount}${suffix}`)
  }
  const monthlyRent = rent === undefined ? undefined : unit === '元/月' ? rent : unit === '元/年' ? rent / 12 : unit === '元/㎡/月' && area ? rent * area : undefined
  const sourceBusinessText = value('招租业态')
  const suitableBusiness = sourceBusinessText.split(/[、,，;；]/).map(item => item.trim()).filter(Boolean).filter(item => item !== '零售').map(item => item === '烘焙' ? '烘焙甜品' : item)
  const unknown = suitableBusiness.filter(item => !options.businesses.includes(item))
  if (unknown.length) throw new Error(`招租业态：未配置 ${unknown.join('、')}`)
  const isDemo = /样例|示例|演示/.test(`${value('备注')}${venue}`)
  const schoolName = businessScene === 'campus' ? venue : ''
  const status = ({ 招租中: 'online', 洽谈中: 'online', 已出租: 'full', 暂停招租: 'offline' } as Record<string, string>)[value('招租状态')]
  if (!status) throw new Error('招租状态无效，应为招租中、洽谈中、已出租或暂停招租')
  const propertyType = value('商铺类型')
  const typeAliases: Record<string, string> = { '校园内独立商铺': '校内铺位', '独立商铺': '校内铺位', '临时摊位': '校园服务点', '其他': '其他' }
  if (propertyType && !options.campusTypes.includes(propertyType) && !typeAliases[propertyType]) throw new Error(`商铺类型：未配置 ${propertyType}`)
  const projectType = options.campusTypes.includes(propertyType) ? propertyType : typeAliases[propertyType] || '其他'
  const population = number('学生人数')
  const data = {
    title: `${isDemo ? '【演示】' : ''}${venue} · ${location}`, listingKind: 'unit', businessScene,
    opportunityType: 'leasing', city, district, schoolName, schoolAlias: '', venueName: venue,
    projectType: businessScene === 'campus' ? projectType : '其他', unitLocation: location, addressText: `${venue} ${location}`,
    areaText: area ? `${area}㎡` : '面积待核实', areaMin: area || null, areaMax: area || null,
    monthlyRentMin: monthlyRent === undefined ? null : Math.round(monthlyRent * 100) / 100,
    monthlyRentMax: monthlyRent === undefined ? null : Math.round(monthlyRent * 100) / 100,
    feeText: feeParts.join('；'), suitableBusiness, status,
    customerInfo: `${isDemo ? '样例房源，仅用于联调。' : ''}${population ? `资料登记服务人数约 ${population} 人，具体客群与人数待核实。` : '客群与营业时段待核实。'}`,
    operatingRequirements: value('招商要求'), cooperationMode: value('合同期限') ? `合同期限 ${value('合同期限')}；其他条款以确认结果为准。` : '合作条款待确认',
    sourcePropertyType: propertyType, sourceBusinessText,
    sourceRemark: `腾讯文档 ${value('房源编号')}；${value('备注')}`,
  }
  const images = record.field_values?.find(cell => cell.field === '商铺图片')?.image_value?.items || []
  if (!images.length) throw new Error('缺少商铺图片')
  return { data, images, isDemo }
}

export function leadCustomerCells(lead: Record<string, unknown>, key: string): Cell[] {
  const scene = options.scenes.find(item => item.value === lead.businessScene)?.label || ''
  return [
    textCell('来源咨询ID', key), textCell('客户称呼', lead.name), textCell('联系电话', lead.phone),
    textCell('咨询类型', LEAD_TYPE_LABELS[String(lead.leadType)] || lead.leadType), textCell('意向场景', scene),
    textCell('经营品类', lead.businessType), textCell('预算', lead.budgetRange), textCell('意向区域', lead.regionPreference),
    textCell('关联房源', lead.projectTitle), textCell('客户说明', lead.remark),
    { field: '提交时间', string_value: String(new Date(String(lead.createdAt)).getTime()) },
  ]
}

export function leadWorkflowCells(lead: Record<string, unknown>): Cell[] {
  return [{ field: '处理状态', option_value: { items: [{ text: LEAD_STATUS_OPTIONS.find(item => item.value === lead.status)?.label || '待联系' }] } }, textCell('内部跟进备注', lead.internalNote)]
}

export function readLeadWorkflow(record: SheetRecord) {
  const label = cellValue(record, '处理状态')
  const status = LEAD_STATUS_OPTIONS.find(item => item.label === label)?.value
  if (!status) throw new Error('客户处理状态无效，请使用待联系、已联系或已结束')
  return { status, internalNote: cellValue(record, '内部跟进备注').slice(0, 5000) }
}
