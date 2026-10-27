import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { commercialFilters, commercialIsPublic, publicCommercialWhere } from '../../lib/commercial'
import options from '../../collections/shared/commercialOptions.json'
import { mapProject } from '../api/_shared/payloadApi'
import { getClientIp, takeRateLimit } from '../api/_shared/rateLimit'
import { LeadForm, type LeadFormState } from './LeadForm'

export const dynamic = 'force-dynamic'
type Opportunity = { id: string; title: string; businessScene: string; city?: string; district?: string; areaText?: string; feeText?: string; suitableBusiness?: string[]; coverImage?: string; status: string; projectType?: string; opportunityType?: string }
const sceneDescriptions: Record<string, string> = { campus: '校内食堂、商业配套与生活服务', industrial_park: '服务园区员工的餐饮与配套空间', office: '面向办公人群的轻餐饮与生活配套' }

async function submitWebsiteLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  'use server'
  const request = new Request('http://local/website-lead', { headers: await headers() })
  if (!takeRateLimit('website-lead:' + getClientIp(request), 10, 60 * 60 * 1000).allowed) return { status: 'error', message: '提交次数较多，请稍后再试。' }
  const name = String(formData.get('name') || '').trim().slice(0, 20)
  const phone = String(formData.get('phone') || '').trim()
  let leadType = String(formData.get('leadType') || 'leasing')
  let businessScene = String(formData.get('businessScene') || '')
  const projectId = String(formData.get('projectId') || '')
  if (formData.get('privacyConsent') !== 'on') return { status: 'error', message: '请先确认信息使用说明，再提交需求。' }
  if (!name) return { status: 'error', message: '请填写称呼，方便顾问与您联系。' }
  if (!/^1[3-9]\d{9}$/.test(phone)) return { status: 'error', message: '请输入有效的 11 位手机号。' }
  if (!['leasing', 'transfer', 'equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(leadType)) return { status: 'error', message: '请选择有效的需求类型。' }
  if (businessScene && !options.scenes.some(scene => scene.value === businessScene)) return { status: 'error', message: '请选择学校、工业园区或写字楼场景。' }
  try {
    const payload = await getPayload({ config })
    if (projectId) {
      if (!/^[1-9]\d*$/.test(projectId) || !Number.isSafeInteger(Number(projectId))) return { status: 'error', message: '房源信息无效，请重新选择。' }
      const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 1, overrideAccess: true }).catch(() => null)
      if (!project || !commercialIsPublic(project) || project.status === 'full') return { status: 'error', message: '该房源暂不接受咨询，请重新选择或提交通用需求。' }
      businessScene = String(project.businessScene || 'campus')
      leadType = 'leasing'
    }
    await payload.create({ collection: 'leads', data: {
      leadType, businessScene: businessScene || null, project: projectId ? Number(projectId) : undefined,
      sourceChannel: 'website', name, phone,
      businessType: String(formData.get('businessType') || '').trim().slice(0, 100) || '待沟通',
      budgetRange: '待沟通', remark: String(formData.get('remark') || '').trim().slice(0, 500), status: 'new',
    } })
    return { status: 'success', message: '需求已收到，顾问会与您确认条件并协助匹配。' }
  } catch (error) {
    console.error('[website-lead]', error instanceof Error ? error.message : 'Submission failed')
    return { status: 'error', message: '暂时无法提交，请稍后重试。已填写的内容仍保留。' }
  }
}

async function getOpportunities() {
  try {
    const payload = await getPayload({ config })
    const results = await Promise.all(options.scenes.map(scene => payload.find({ collection: 'projects', where: { and: [publicCommercialWhere(), ...commercialFilters(new URLSearchParams({ businessScene: scene.value, available: 'true' }))] }, sort: '-isRecommended,-updatedAt', limit: 4, depth: 1 })))
    return { docs: results.flatMap(result => result.docs.map(doc => mapProject(doc) as Opportunity)), failed: false }
  } catch { return { docs: [] as Opportunity[], failed: true } }
}

function PropertyCard({ item }: { item: Opportunity }) {
  const demo = item.title.includes('【演示】') || (item.coverImage || '').includes('/tencent-demo-') || (item.coverImage || '').includes('/images/demo/')
  return <article className="web-opportunity-card">
    <div className="web-property-photo">{item.coverImage ? <Image src={item.coverImage} alt={item.title + '展示图'} width={640} height={420} unoptimized /> : <span>图片待补充</span>}{demo ? <span className="web-photo-label">演示 · 示意图</span> : null}</div>
    <div className="web-property-copy"><div className="web-property-meta"><span>{item.city} · {item.district}</span><span>{item.status === 'coming' ? '即将开放' : '开放中'}</span></div>
      <h3>{item.title}</h3><p className="web-property-area">{item.areaText || '面积待确认'} · {item.projectType === '食堂档口' ? '饭堂档口' : '配套商铺'}</p>
      <p className="web-property-fee">{item.feeText || '费用待确认'}</p>
      {item.suitableBusiness?.length ? <p className="web-property-business">适合 {item.suitableBusiness.slice(0, 3).join(' / ')}</p> : null}
      <a className="web-property-contact" href={'/?projectId=' + encodeURIComponent(item.id) + '#lead-form'}>咨询这处房源 <span aria-hidden="true">↗</span></a>
    </div>
  </article>
}

export default async function Home({ searchParams }: { searchParams: Promise<{ projectId?: string; scene?: string }> }) {
  const [query, opportunities] = await Promise.all([searchParams, getOpportunities()])
  let selectedProject = opportunities.docs.find(item => item.id === query.projectId) || null
  if (!selectedProject && query.projectId && /^[1-9]\d*$/.test(query.projectId)) {
    try {
      const payload = await getPayload({ config })
      const result = await payload.find({ collection: 'projects', where: { and: [publicCommercialWhere(), { id: { equals: query.projectId } }, { status: { in: ['online', 'coming'] } }] }, depth: 1, limit: 1 })
      if (result.docs[0]) selectedProject = mapProject(result.docs[0]) as Opportunity
    } catch { /* The public fallback and general form remain available. */ }
  }
  const initialScene = options.scenes.some(scene => scene.value === query.scene) ? query.scene : ''
  return <>
    <a className="web-skip-link" href="#main-content">跳到主要内容</a>
    <header className="web-site-header"><Link className="web-brand" href="/">饭堂与商铺<span>学校 · 园区 · 写字楼</span></Link><a className="web-header-action" href="#lead-form">提交找铺需求</a></header>
    <main id="main-content">
      <section className="web-scope-hero"><div className="web-content">
        <p className="web-eyebrow">封闭与半封闭物业招租服务</p><h1>找对场所，<br />让生意更有方向。</h1>
        <p className="web-hero-description">为餐饮与生活服务经营者，寻找学校、工业园区、写字楼里的饭堂档口和配套商铺。</p>
        <div className="web-hero-actions"><a className="web-header-action" href="#opportunities">浏览可咨询房源</a><a className="web-secondary-action" href="#lead-form">让顾问帮我找</a></div>
        <nav className="web-scene-navigation" aria-label="按物业场景找房源">{options.scenes.map((scene, index) => <a href={'#scene-' + scene.value} key={scene.value}><span className="web-scene-number">0{index + 1}</span><strong>{scene.label}</strong><span>{sceneDescriptions[scene.value]}</span><span aria-hidden="true">↗</span></a>)}</nav>
      </div></section>
      <section className="web-content web-list-section" id="opportunities"><div className="web-section-heading"><div><p className="web-eyebrow">经营空间</p><h2>从你的目标场景开始找</h2></div><p>默认展示开放中与即将开放的房源。<br />费用、经营条件与档期由顾问进一步确认。</p></div>
        {opportunities.failed ? <div className="web-empty-state" role="status">暂时无法加载房源。<Link href="/">刷新重试</Link>，也可以先登记找铺需求。</div> : options.scenes.map(scene => {
          const items = opportunities.docs.filter(item => item.businessScene === scene.value)
          return <section className="web-scene-section" id={'scene-' + scene.value} key={scene.value}><div className="web-scene-heading"><h3>{scene.label}</h3><a href={'/?scene=' + scene.value + '#lead-form'}>登记{scene.label}找铺需求 →</a></div>
            {items.length ? <div className="web-property-grid">{items.map(item => <PropertyCard key={item.id} item={item} />)}</div> : <div className="web-empty-state">该场景的房源正在整理中，可先告诉我们你的品类、预算与意向区域。</div>}
          </section>
        })}
      </section>
      <section className="web-lead-section" id="lead-form"><div className="web-content web-lead-layout"><div><p className="web-eyebrow">需求匹配</p><h2>先说需求，<br />顾问帮你缩小选择。</h2><p>提交后，我们会与你确认经营品类、费用承受范围和营业安排，再协助匹配房源与沟通看铺。</p><ol className="web-service-steps"><li>登记经营需求</li><li>确认条件并匹配房源</li><li>协助看铺与后续沟通</li></ol><details className="web-support-services"><summary>转让、餐饮设备等配套服务</summary><p>如已有店铺需要转让，或有餐饮设备出售、求购需求，可在右侧选择对应需求类型。</p></details></div>
        <div>{query.projectId && !selectedProject ? <p className="web-selection-notice" role="status">原房源暂不可咨询，你可以提交通用需求，让顾问寻找其他选择。</p> : null}<LeadForm key={selectedProject?.id || initialScene || 'general'} action={submitWebsiteLead} selectedProject={selectedProject} initialScene={initialScene} /></div>
      </div></section>
    </main><footer className="web-site-footer web-content">饭堂与商铺 · 专注固定服务客群的经营空间</footer>
  </>
}
