'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ShareMaterialPanel } from './ShareMaterialPanel'

type LeadTodo = {
  id: string
  name: string
  phone: string
  leadType: string
  leadTypeLabel: string
  category: string
  status: string
  createdAt?: string
  businessType?: string
}

type ProjectTodo = {
  id: string
  title: string
  status: string
  district?: string
  schoolName?: string
  missingFields: string[]
  ready: boolean
}

type ShareProject = {
  id: string
  title: string
  status: string
  schoolName?: string
  district?: string
  path: string
  headline: string
  copyText: string
  shortText: string
}

type WorkbenchData = {
  generatedAt: string
  staleHours: number
  team: {
    label: string
    summary: {
      newLeads: number
      staleLeads: number
      blockedProjects: number
      readyToPublish: number
      publicIncomplete: number
    }
    newLeads: LeadTodo[]
    staleLeads: LeadTodo[]
    blockedProjects: ProjectTodo[]
    readyToPublish: ProjectTodo[]
  }
  funnel: {
    submitted: number
    new: number
    contacted: number
    closed: number
    converted: number
    truncated: boolean
    byCategory: Array<{ category: string; label: string; total: number; new: number; contacted: number; closed: number }>
    byStatus: Array<{ status: string; label: string; count: number }>
  }
  quality: {
    scanned: number
    totalProjects: number
    readyCount: number
    blockedCount: number
    readyToPublishCount: number
    publicIncompleteCount: number
    requiredFields: string[]
    blocked: ProjectTodo[]
    publicIncomplete: ProjectTodo[]
  }
  share: { projects: ShareProject[] }
}

const dateFmt = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function FunnelBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const width = total ? Math.max(6, pct(value, total)) : 0
  return (
    <div className="cms-funnel__row">
      <div className="cms-funnel__label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="cms-funnel__track" aria-hidden="true">
        <div className="cms-funnel__fill" style={{ width: `${width}%`, background: tone }} />
      </div>
    </div>
  )
}

export function OpsWorkbenchView() {
  const [data, setData] = useState<WorkbenchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareId, setShareId] = useState<string>('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await readJson<WorkbenchData>(await fetch('/api/admin/ops-workbench', { signal }))
      setData(result)
      setShareId(prev => prev || result.share.projects[0]?.id || '')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '工作台加载失败')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const selectedShare = data?.share.projects.find(p => p.id === shareId) || data?.share.projects[0]

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">团队运营</p>
          <h1>运营工作台</h1>
          <p>待办、咨询漏斗、房源上架门禁与分享素材，服务全员日常运营。</p>
        </div>
        <button className="cms-button" type="button" disabled={loading} onClick={() => void load()}>
          {loading ? '刷新中…' : '刷新数据'}
        </button>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {loading && !data ? <div className="cms-empty">工作台加载中…</div> : null}

      {data ? (
        <>
          {/* —— 1. Team todos —— */}
          <section className="cms-ops-section" aria-labelledby="ops-todo-title">
            <div className="cms-ops-section__head">
              <div>
                <h2 id="ops-todo-title">团队待办</h2>
                <p>{data.team.label} · 超 {data.staleHours} 小时未联系视为超时</p>
              </div>
              <div className="cms-ops-kpis">
                <div className="cms-ops-kpi"><span>待联系</span><strong>{data.team.summary.newLeads}</strong></div>
                <div className="cms-ops-kpi cms-ops-kpi--warn"><span>超时未联</span><strong>{data.team.summary.staleLeads}</strong></div>
                <div className="cms-ops-kpi cms-ops-kpi--warn"><span>门禁未过</span><strong>{data.team.summary.blockedProjects}</strong></div>
                <div className="cms-ops-kpi cms-ops-kpi--ok"><span>可上架</span><strong>{data.team.summary.readyToPublish}</strong></div>
              </div>
            </div>

            <div className="cms-ops-grid">
              <article className="cms-panel cms-ops-card">
                <header>
                  <h3>待联系咨询</h3>
                  <Link href="/admin/workspace/inquiries?status=new">全部</Link>
                </header>
                {data.team.newLeads.length ? (
                  <ul className="cms-ops-list">
                    {data.team.newLeads.map(item => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.leadTypeLabel}{item.businessType ? ` · ${item.businessType}` : ''}</small>
                        </div>
                        <div className="cms-row-actions">
                          {item.phone ? <a className="cms-button" href={`tel:${item.phone}`}>拨打</a> : null}
                          <Link className="cms-button" href={`/admin/collections/leads/${item.id}`}>处理</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="cms-empty" style={{ padding: 24 }}>暂无待联系</div>}
              </article>

              <article className="cms-panel cms-ops-card">
                <header>
                  <h3>超时未联系</h3>
                  <Link href="/admin/workspace/inquiries?status=new">去收件箱</Link>
                </header>
                {data.team.staleLeads.length ? (
                  <ul className="cms-ops-list">
                    {data.team.staleLeads.map(item => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small className="cms-warning">
                            {item.createdAt ? dateFmt.format(new Date(item.createdAt)) : '—'} 提交 · 仍待联系
                          </small>
                        </div>
                        <Link className="cms-button cms-button--primary" href={`/admin/collections/leads/${item.id}`}>跟进</Link>
                      </li>
                    ))}
                  </ul>
                ) : <div className="cms-empty" style={{ padding: 24 }}>没有超时单，状态良好</div>}
              </article>

              <article className="cms-panel cms-ops-card">
                <header>
                  <h3>待补全房源</h3>
                  <Link href="/admin/collections/projects?quality=blocked">房源列表</Link>
                </header>
                {data.team.blockedProjects.length ? (
                  <ul className="cms-ops-list">
                    {data.team.blockedProjects.map(item => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <small className="cms-warning">缺 {item.missingFields.join('、')}</small>
                        </div>
                        <Link className="cms-button" href={`/admin/collections/projects/${item.id}`}>补全</Link>
                      </li>
                    ))}
                  </ul>
                ) : <div className="cms-empty" style={{ padding: 24 }}>暂无门禁拦截项</div>}
              </article>

              <article className="cms-panel cms-ops-card">
                <header>
                  <h3>资料齐全可上架</h3>
                  <Link href="/admin/collections/projects?quality=ready">去上架</Link>
                </header>
                {data.team.readyToPublish.length ? (
                  <ul className="cms-ops-list">
                    {data.team.readyToPublish.map(item => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.schoolName || item.district || item.status} · 门禁已通过</small>
                        </div>
                        <Link className="cms-button cms-button--primary" href={`/admin/collections/projects/${item.id}`}>上架</Link>
                      </li>
                    ))}
                  </ul>
                ) : <div className="cms-empty" style={{ padding: 24 }}>没有待发布的完整草稿</div>}
              </article>
            </div>
          </section>

          {/* —— 2. Funnel —— */}
          <section className="cms-ops-section" aria-labelledby="ops-funnel-title">
            <div className="cms-ops-section__head">
              <div>
                <h2 id="ops-funnel-title">咨询漏斗</h2>
                <p>
                  提交 → 待联系 → 已联系 → 已结束
                  {data.funnel.truncated ? `（按最近 ${data.funnel.byStatus.reduce((n, s) => n + s.count, 0)} 条样本估算分类）` : ''}
                </p>
              </div>
            </div>
            <div className="cms-ops-grid cms-ops-grid--funnel">
              <article className="cms-panel cms-ops-card">
                <h3>总览</h3>
                <div className="cms-funnel">
                  <FunnelBar label="全部提交" value={data.funnel.submitted} total={data.funnel.submitted} tone="#1d4ed8" />
                  <FunnelBar label="待联系" value={data.funnel.new} total={data.funnel.submitted} tone="#2563eb" />
                  <FunnelBar label="已联系" value={data.funnel.contacted} total={data.funnel.submitted} tone="#047857" />
                  <FunnelBar label="已结束" value={data.funnel.closed} total={data.funnel.submitted} tone="#64748b" />
                  <FunnelBar label="已生成房源" value={data.funnel.converted} total={data.funnel.submitted} tone="#b45309" />
                </div>
                <p className="cms-help" style={{ marginTop: 12 }}>
                  联系率 {pct(data.funnel.contacted + data.funnel.closed, data.funnel.submitted)}%
                  · 结束率 {pct(data.funnel.closed, data.funnel.submitted)}%
                  · 转让转房源 {data.funnel.converted} 单
                </p>
              </article>
              <article className="cms-panel cms-ops-card">
                <h3>按业务线</h3>
                <div className="cms-table-wrap">
                  <table className="cms-table" style={{ minWidth: 480 }}>
                    <thead>
                      <tr>
                        <th>业务线</th>
                        <th>合计</th>
                        <th>待联系</th>
                        <th>已联系</th>
                        <th>已结束</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.funnel.byCategory.map(row => (
                        <tr key={row.category}>
                          <td><strong>{row.label}</strong></td>
                          <td>{row.total}</td>
                          <td>{row.new}</td>
                          <td>{row.contacted}</td>
                          <td>{row.closed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>

          {/* —— 3. Quality gates —— */}
          <section className="cms-ops-section" aria-labelledby="ops-quality-title">
            <div className="cms-ops-section__head">
              <div>
                <h2 id="ops-quality-title">上架质量门禁</h2>
                <p>必填：{data.quality.requiredFields.join('、')}。扫描 {data.quality.scanned}/{data.quality.totalProjects} 套房源。</p>
              </div>
              <div className="cms-ops-kpis">
                <div className="cms-ops-kpi cms-ops-kpi--ok"><span>齐全</span><strong>{data.quality.readyCount}</strong></div>
                <div className="cms-ops-kpi cms-ops-kpi--warn"><span>未过门禁</span><strong>{data.quality.blockedCount}</strong></div>
                <div className="cms-ops-kpi"><span>可上架草稿</span><strong>{data.quality.readyToPublishCount}</strong></div>
                <div className="cms-ops-kpi cms-ops-kpi--danger"><span>已上架仍缺项</span><strong>{data.quality.publicIncompleteCount}</strong></div>
              </div>
            </div>
            <div className="cms-ops-grid">
              <article className="cms-panel cms-ops-card cms-ops-card--wide">
                <header>
                  <h3>未过门禁明细</h3>
                  <Link href="/admin/collections/projects?quality=blocked">在房源列表查看</Link>
                </header>
                {data.quality.blocked.length ? (
                  <div className="cms-table-wrap">
                    <table className="cms-table" style={{ minWidth: 640 }}>
                      <thead>
                        <tr>
                          <th>房源</th>
                          <th>状态</th>
                          <th>缺失项</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.quality.blocked.map(item => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.title}</strong>
                              <small>{item.schoolName || item.district || '—'}</small>
                            </td>
                            <td><span className={`cms-status cms-status--${item.status}`}>{item.status}</span></td>
                            <td>
                              <div className="cms-gate-tags">
                                {item.missingFields.map(field => (
                                  <span className="cms-gate-tag cms-gate-tag--miss" key={field}>{field}</span>
                                ))}
                              </div>
                            </td>
                            <td><Link className="cms-button" href={`/admin/collections/projects/${item.id}`}>去补全</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="cms-empty" style={{ padding: 28 }}>全部扫描房源均已通过门禁</div>}
              </article>
            </div>
          </section>

          {/* —— 4. Share materials —— */}
          <section className="cms-ops-section" aria-labelledby="ops-share-title">
            <div className="cms-ops-section__head">
              <div>
                <h2 id="ops-share-title">分享素材一键生成</h2>
                <p>从已开放房源生成小程序路径与社群文案，便于投放到微信。</p>
              </div>
            </div>
            <div className="cms-ops-grid cms-ops-grid--share">
              <article className="cms-panel cms-ops-card">
                <h3>选择房源</h3>
                {data.share.projects.length ? (
                  <ul className="cms-ops-list">
                    {data.share.projects.map(item => (
                      <li key={item.id} className={shareId === item.id || (!shareId && item.id === data.share.projects[0]?.id) ? 'is-active' : undefined}>
                        <button type="button" className="cms-ops-select" onClick={() => setShareId(item.id)}>
                          <strong>{item.title}</strong>
                          <small>{item.schoolName || item.district || item.status}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="cms-empty" style={{ padding: 24 }}>
                    暂无开放中房源。请先在房源管理上架后再生成素材。
                  </div>
                )}
              </article>
              <article className="cms-panel cms-ops-card">
                {selectedShare ? (
                  <ShareMaterialPanel
                    project={{
                      id: selectedShare.id,
                      title: selectedShare.title,
                      schoolName: selectedShare.schoolName,
                      district: selectedShare.district,
                      status: selectedShare.status,
                    }}
                  />
                ) : (
                  <div className="cms-empty" style={{ padding: 24 }}>请选择左侧房源</div>
                )}
              </article>
            </div>
          </section>

          <p className="cms-help">数据生成于 {dateFmt.format(new Date(data.generatedAt))}，点击右上角可刷新。</p>
        </>
      ) : null}
    </main>
  )
}

export default OpsWorkbenchView
