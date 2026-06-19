import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Opportunity = {
  id: string
  opportunityType?: 'leasing' | 'transfer'
  title: string
  city?: string
  district?: string
  schoolName?: string
  projectType?: string
  areaText?: string
  feeText?: string
  suitableBusiness?: string[]
  highlights?: string[]
  advisorTips?: string
  coverImage?: string
  status?: string
  isRecommended?: boolean
}

async function submitWebsiteLead(formData: FormData) {
  'use server'

  const name = String(formData.get('name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const leadType = String(formData.get('leadType') || 'leasing')
  const businessType = String(formData.get('businessType') || '').trim()
  const remark = String(formData.get('remark') || '').trim()

  if (!name || !/^1[3-9]\d{9}$/.test(phone)) return

  const dataPath = path.resolve(process.cwd(), '..', 'data.json')
  let fileWriteSuccess = false

  // 1. 尝试写入本地 data.json (本地 Mock / Demo 状态)
  try {
    if (fs.existsSync(dataPath)) {
      const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as {
        leads?: Array<Record<string, unknown>>
      }
      raw.leads = raw.leads || []
      raw.leads.push({
        id: `l${Math.random().toString(36).slice(2, 9)}`,
        leadType,
        sourceChannel: 'website',
        name,
        phone,
        businessType: businessType || '网站提交需求',
        budgetRange: '待沟通',
        remark,
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      fs.writeFileSync(dataPath, JSON.stringify(raw, null, 2), 'utf8')
      fileWriteSuccess = true
    }
  } catch (err) {
    console.warn('Failed to write to local data.json, falling back to Payload database...', err)
  }

  // 2. 如果文件写入失败（或不存在，如 Docker 容器环境），则写入 Payload 真实数据库
  if (!fileWriteSuccess) {
    try {
      const payloadInstance = await getPayload({ config })
      await payloadInstance.create({
        collection: 'leads',
        data: {
          leadType: leadType as 'leasing' | 'transfer' | 'equipment_sell' | 'equipment_buy' | 'equipment_recycle' | 'brand_cooperation',
          sourceChannel: 'website',
          name,
          phone,
          businessType: businessType || '网站提交需求',
          budgetRange: '待沟通',
          remark,
          status: 'new',
        },
      })
    } catch (dbErr) {
      console.error('Failed to write lead to Payload database:', dbErr)
    }
  }
}

const serviceCards = [
  {
    title: '找校园铺位',
    desc: '食堂档口、校园商业街、校内服务点统一展示，支持按区域、预算和业态筛选。',
    stat: '招商主线',
  },
  {
    title: '委托店铺转让',
    desc: '老商户提交转让需求，平台审核合同限制、设备和装修信息后定向撮合。',
    stat: '新增营收',
  },
  {
    title: '餐饮设备供需',
    desc: '出售设备、求购设备、回收咨询统一进入线索池，先人工撮合，不做在线交易。',
    stat: '降本配套',
  },
  {
    title: '品牌合作入口',
    desc: '品牌方找校园点位、学校/物业引入品牌，先保留轻量表单 and 顾问对接。',
    stat: '轻量拓展',
  },
]

async function getOpportunities() {
  const dataPath = path.resolve(process.cwd(), '..', 'data.json')

  // 1. 尝试从 local data.json 读取 (本地 Mock / Demo 状态优先)
  try {
    if (fs.existsSync(dataPath)) {
      const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as { projects?: Opportunity[] }
      return (raw.projects || [])
        .filter(item => item.status !== 'offline' && item.status !== 'draft')
        .sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended))
        .slice(0, 6)
    }
  } catch (err) {
    console.warn('Failed to read opportunities from local data.json, falling back to Payload database...', err)
  }

  // 2. 如果读取文件失败或不存在，从 Payload 真实数据库中查询
  try {
    const payloadInstance = await getPayload({ config })
    const result = await payloadInstance.find({
      collection: 'projects',
      where: {
        and: [
          { status: { not_in: ['offline', 'draft'] } },
          { auditStatus: { equals: 'approved' } }
        ]
      },
      sort: '-isRecommended',
      limit: 6,
    })

    return result.docs.map(doc => ({
      id: doc.id,
      opportunityType: doc.opportunityType as 'leasing' | 'transfer',
      title: doc.title,
      city: doc.city || undefined,
      district: doc.district || undefined,
      schoolName: doc.schoolName || undefined,
      projectType: doc.projectType,
      areaText: doc.areaText || undefined,
      feeText: doc.feeText || undefined,
      suitableBusiness: doc.suitableBusiness?.map((b: { item?: string | null }) => b.item).filter(Boolean) as string[] || [],
      highlights: doc.highlights?.map((h: { item?: string | null }) => h.item).filter(Boolean) as string[] || [],
      advisorTips: doc.advisorTips || undefined,
      coverImage: typeof doc.coverImage === 'object' && doc.coverImage ? (doc.coverImage as { url?: string | null }).url || undefined : undefined,
      status: doc.status,
      isRecommended: doc.isRecommended || undefined,
    }))
  } catch (dbErr) {
    console.error('Failed to read opportunities from Payload database:', dbErr)
    return []
  }
}

export default async function Home() {
  const opportunities = await getOpportunities()
  const leasingCount = opportunities.filter(item => (item.opportunityType || 'leasing') === 'leasing').length
  const transferCount = opportunities.filter(item => item.opportunityType === 'transfer').length

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <div className="text-lg font-bold">校园商铺招商平台</div>
            <div className="text-sm text-slate-500">招商、转让、设备供需一体化撮合</div>
          </div>
          <a className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="#lead-form">
            提交需求
          </a>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold text-blue-700">面向餐饮、零售、校园服务商户</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal md:text-5xl">
              找校园铺位、转让店铺、处理餐饮设备，用同一个线索系统完成撮合。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              小程序负责微信内快速咨询和复访，网站负责公开展示、搜索获客和合作方背书。所有需求进入同一后台，由招商顾问跟进。
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="text-2xl font-bold">{leasingCount}</div>
                <div className="text-sm text-slate-500">招商机会</div>
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <div className="text-2xl font-bold">{transferCount}</div>
                <div className="text-sm text-slate-500">转让机会</div>
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-slate-500">设备需求类型</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {serviceCards.map(card => (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-5" key={card.title}>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold">{card.title}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{card.stat}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">精选机会</h2>
            <p className="mt-2 text-sm text-slate-500">与小程序共用数据源，后续可扩展为独立列表页和详情页。</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map(item => (
            <article className="overflow-hidden rounded-md border border-slate-200 bg-white" key={item.id}>
              <div
                className="h-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'})` }}
              />
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {item.opportunityType === 'transfer' ? '委托转让' : '招商铺位'}
                  </span>
                  <span className="text-xs text-slate-500">{item.city} · {item.district}</span>
                </div>
                <h3 className="line-clamp-2 min-h-14 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.schoolName || item.projectType}</p>
                <p className="mt-3 text-base font-bold text-red-600">{item.feeText}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.advisorTips || item.highlights?.join('、')}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white" id="lead-form">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-bold">网站表单定位</h2>
            <p className="mt-3 leading-7 text-slate-600">
              第一版网站表单可直接复用后端线索 API，记录来源为 website。上线前再接入验证码或微信授权，避免垃圾线索。
            </p>
          </div>
          <form action={submitWebsiteLead} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <input name="name" className="rounded-md border border-slate-300 px-3 py-3 text-sm" placeholder="称呼" required />
              <input name="phone" className="rounded-md border border-slate-300 px-3 py-3 text-sm" placeholder="手机号" required />
            </div>
            <select name="leadType" className="rounded-md border border-slate-300 px-3 py-3 text-sm" defaultValue="leasing">
              <option value="leasing">找校园铺位</option>
              <option value="transfer">委托店铺转让</option>
              <option value="equipment_sell">出售设备</option>
              <option value="equipment_buy">求购设备</option>
              <option value="brand_cooperation">品牌合作</option>
            </select>
            <input name="businessType" className="rounded-md border border-slate-300 px-3 py-3 text-sm" placeholder="经营品类/设备名称/品牌名称" />
            <textarea name="remark" className="min-h-28 rounded-md border border-slate-300 px-3 py-3 text-sm" placeholder="请简要说明需求" />
            <button className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
              提交需求
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
