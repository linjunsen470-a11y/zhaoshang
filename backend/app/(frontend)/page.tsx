import { publicCommercialWhere } from '../../lib/commercial'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { mapProject } from '../api/_shared/payloadApi'
import { headers } from 'next/headers'
import { getClientIp, takeRateLimit } from '../api/_shared/rateLimit'
import { LeadForm, type LeadFormState } from './LeadForm'

export const dynamic = 'force-dynamic'

type Opportunity = {
  id: string
  opportunityType?: 'leasing' | 'transfer'
  title: string
  city?: string
  district?: string
  venueName?: string
  placeLabel?: string
  schoolName?: string
  projectType?: string
  areaText?: string
  feeText?: string
  suitableBusiness?: string[]
  highlights?: string[]
  coverImage?: string
  status?: string
  isRecommended?: boolean
}

async function submitWebsiteLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  'use server'

  const requestHeaders = await headers()
  const request = new Request('http://local/website-lead', { headers: requestHeaders })
  const rate = takeRateLimit(`website-lead:${getClientIp(request)}`, 10, 60 * 60 * 1000)
  if (!rate.allowed) {
    return { status: 'error', message: '提交次数较多，请稍后再试，或直接联系招商顾问。' }
  }

  const name = String(formData.get('name') || '').trim().slice(0, 20)
  const phone = String(formData.get('phone') || '').trim()
  const leadType = String(formData.get('leadType') || 'leasing')
  const businessType = String(formData.get('businessType') || '').trim().slice(0, 100)
  const remark = String(formData.get('remark') || '').trim().slice(0, 500)
  const allowedLeadTypes = new Set([
    'leasing', 'transfer', 'equipment_sell', 'equipment_buy', 'equipment_recycle', 'brand_cooperation',
  ])

  if (formData.get('privacyConsent') !== 'on') {
    return { status: 'error', message: '请先确认信息使用说明，再提交需求。' }
  }
  if (!name) return { status: 'error', message: '请填写称呼，方便招商顾问与您联系。' }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { status: 'error', message: '请输入有效的 11 位手机号。' }
  }
  if (!allowedLeadTypes.has(leadType)) {
    return { status: 'error', message: '请选择有效的需求类型后重新提交。' }
  }

  try {
    const payloadInstance = await getPayload({ config })
    await payloadInstance.create({
      collection: 'leads',
      data: {
        leadType: leadType as
          | 'leasing'
          | 'transfer'
          | 'equipment_sell'
          | 'equipment_buy'
          | 'equipment_recycle'
          | 'brand_cooperation',
        sourceChannel: 'website',
        name,
        phone,
        businessType: businessType || '网站提交需求',
        budgetRange: '待沟通',
        remark,
        status: 'new',
      },
    })
    return { status: 'success', message: '需求已提交，招商顾问会尽快与您联系。' }
  } catch (dbErr) {
    console.error('Failed to write lead to Payload database:', dbErr)
    return { status: 'error', message: '暂时无法提交，请稍后重试，或直接联系招商顾问。' }
  }
}

const serviceCards = [
  {
    title: '找商铺',
    desc: '按区域、面积和基础月租查看校园、社区、文旅及购物中心的项目与铺位。',
  },
  {
    title: '委托店铺转让',
    desc: '提交店铺位置、合同期限和设备情况，由招商顾问协助联系意向方。',
  },
  {
    title: '餐饮设备供需',
    desc: '登记出售、求购或回收需求，由运营人员审核资料并协助双方沟通。',
  },
  {
    title: '品牌合作入口',
    desc: '为品牌方寻找经营点位，也为学校和物业提供品牌引入咨询。',
  },
]

async function getOpportunities() {
  try {
    const payloadInstance = await getPayload({ config })
    const result = await payloadInstance.find({
      collection: 'projects',
      where: publicCommercialWhere(),
      sort: '-isRecommended',
      limit: 6,
      depth: 1,
    })

    return result.docs.map(doc => mapProject(doc) as Opportunity)
  } catch (dbErr) {
    console.error('Failed to read opportunities from Payload database:', dbErr)
    return []
  }
}

export default async function Home() {
  const opportunities = await getOpportunities()
  const featured = opportunities[0]

  return (
    <>
      <a className="web-skip-link" href="#main-content">跳到主要内容</a>
      <main className="min-h-screen bg-white text-[#161a18]" id="main-content">
      <section className="border-b border-[#e3e7e5]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <div className="text-lg font-semibold">商业空间</div>
            <div className="text-sm text-[#66706c]">商铺招商、店铺转让与设备供需</div>
          </div>
          <a className="web-header-action" href="#lead-form">
            提交需求
          </a>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-sm text-[#66706c]">餐饮、零售与校园服务</p>
            <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-tight md:text-5xl">
              找项目、选铺位、转让店铺，一次提交即可获得顾问协助。
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-[#66706c]">
              查看校园、社区、文旅和购物中心的招商信息，也可登记店铺转让、设备供需及品牌合作需求。提交后由招商顾问联系并跟进。
            </p>
            <div className="mt-8 border-y border-[#e3e7e5]">
              {serviceCards.map(card => (
                <div className="grid gap-1 border-b border-[#e3e7e5] py-4 last:border-b-0" key={card.title}>
                  <h2 className="text-base font-semibold">{card.title}</h2>
                  <p className="text-sm leading-6 text-[#66706c]">{card.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="web-header-action" href="#opportunities">查看项目与铺位</a>
              <a className="web-secondary-action" href="#lead-form">提交需求</a>
            </div>
          </div>
          <article className="overflow-hidden rounded border border-[#e3e7e5] bg-white">
            {featured ? (
              <>
                <div
                  className="h-80 bg-[#f3f6f5] bg-cover bg-center"
                  role="img"
                  aria-label={`${featured.title}封面`}
                  style={{ backgroundImage: featured.coverImage ? `url(${featured.coverImage})` : undefined }}
                />
                <div className="p-5">
                  <p className="text-xs text-[#66706c]">
                    {featured.opportunityType === 'transfer' ? '转让店铺' : '招商铺位'}
                    {featured.city ? ` · ${featured.city}` : ''}
                    {featured.district ? ` / ${featured.district}` : ''}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{featured.title}</h2>
                  <p className="mt-3 text-lg font-semibold text-[#1e3a34]">{featured.feeText || '费用面议'}</p>
                </div>
              </>
            ) : (
              <div className="flex h-80 items-center justify-center p-8 text-center text-sm text-[#66706c]">
                暂无公开项目与铺位。可以先提交需求，由招商顾问协助查找。
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl scroll-mt-8 px-5 py-12" id="opportunities">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">精选项目与铺位</h2>
            <p className="mt-2 text-sm text-[#66706c]">查看近期开放的招商项目、具体铺位和转让店铺。</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map(item => (
            <article className="web-opportunity-card" key={item.id}>
              <div
                className="h-40 bg-cover bg-center"
                role="img"
                aria-label={`${item.title}封面`}
                style={{
                  backgroundImage: `url(${item.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'})`,
                }}
              />
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-sm bg-[#e7eeea] px-2 py-1 text-xs font-medium text-[#1e3a34]">
                    {item.opportunityType === 'transfer' ? '转让店铺' : '招商铺位'}
                  </span>
                  <span className="text-xs text-[#66706c]">
                    {item.city} / {item.district}
                  </span>
                </div>
                <h3 className="line-clamp-2 min-h-14 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 truncate text-sm text-[#66706c]">{item.placeLabel || item.projectType || '位置待确认'}</p>
                <p className="mt-3 text-base font-semibold text-[#1e3a34]">{item.feeText || '费用面议'}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66706c]">
                  {item.highlights?.join('、')}
                </p>
              </div>
            </article>
          ))}
          {!opportunities.length ? (
            <div className="col-span-full rounded-sm border border-dashed border-[#e3e7e5] bg-white p-8 text-center text-sm text-[#66706c]">
              暂无公开项目与铺位。您可以先提交需求，由招商顾问协助查找。
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-[#e3e7e5]" id="lead-form">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold">提交合作需求</h2>
            <p className="mt-3 leading-7 text-[#66706c]">
              填写您的经营方向和联系方式，招商顾问会根据需求提供项目推荐、转让或设备供需对接服务。
            </p>
          </div>
          <LeadForm action={submitWebsiteLead} />
        </div>
      </section>
      </main>
    </>
  )
}
