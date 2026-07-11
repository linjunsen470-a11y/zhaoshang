'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type LeadTodo = {
  id: string
  name: string
  phone: string
  leadTypeLabel: string
  status: string
  createdAt?: string
  businessType?: string
}

type WorkbenchData = {
  generatedAt: string
  staleHours: number
  team: {
    summary: {
      newLeads: number
      staleLeads: number
      blockedProjects: number
      readyToPublish: number
    }
    newLeads: LeadTodo[]
    staleLeads: LeadTodo[]
  }
  funnel: {
    submitted: number
    new: number
    contacted: number
    closed: number
    converted: number
    byCategory: Array<{ category: string; label: string; total: number; new: number; contacted: number; closed: number }>
  }
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
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')
  const [revealedPhoneId, setRevealedPhoneId] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      setData(await readJson<WorkbenchData>(await fetch('/api/admin/ops-workbench', { signal })))
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

  const staleIds = useMemo(
    () => new Set((data?.team.staleLeads || []).map(item => item.id)),
    [data?.team.staleLeads],
  )

  const markLead = async (id: string, status: 'contacted' | 'closed') => {
    setBusyId(id)
    setError('')
    try {
      await readJson(await fetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      }))
      setMessage(status === 'contacted' ? '已标记为已联系' : '已标记为已结束')
      await load()
      window.setTimeout(() => setMessage(''), 2200)
    } catch (err) {
      setError(err instanceof Error ? err.message : '状态更新失败')
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">团队运营</p>
          <h1>运营工作台</h1>
        </div>
        <button className="cms-button" type="button" disabled={loading} onClick={() => void load()}>
          {loading ? '刷新中…' : '刷新数据'}
        </button>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      <div className="cms-live" aria-live="polite">{message}</div>
      {loading && !data ? <div className="cms-empty">工作台加载中…</div> : null}

      {data ? (
        <section className="cms-ops-section" aria-labelledby="ops-todo-title">
          <div className="cms-ops-section__head">
            <div>
              <h2 id="ops-todo-title">待办与漏斗</h2>
            </div>
            <div className="cms-ops-kpis">
              <div className="cms-ops-kpi"><span>待联系</span><strong>{data.team.summary.newLeads}</strong></div>
              <div className="cms-ops-kpi cms-ops-kpi--warn"><span>超时未联</span><strong>{data.team.summary.staleLeads}</strong></div>
              <div className="cms-ops-kpi"><span>漏斗总量</span><strong>{data.funnel.submitted}</strong></div>
              <div className="cms-ops-kpi cms-ops-kpi--ok"><span>已联系</span><strong>{data.funnel.contacted}</strong></div>
            </div>
          </div>

          <article className="cms-panel cms-ops-card" style={{ marginBottom: 14 }}>
            <header>
              <h3>待联系咨询</h3>
              <Link href="/admin/workspace/inquiries?status=new">收件箱</Link>
            </header>
            {data.team.newLeads.length ? (
              <ul className="cms-ops-list">
                {data.team.newLeads.map(item => {
                  const isStale = staleIds.has(item.id)
                  const showPhone = revealedPhoneId === item.id
                  return (
                    <li key={item.id}>
                      <div className="cms-ops-lead">
                        <div className="cms-ops-lead__title">
                          <strong>{item.name}</strong>
                          {isStale ? (
                            <span
                              className="cms-ops-stale"
                              title={item.createdAt
                                ? `${dateFmt.format(new Date(item.createdAt))} 提交，已超过 ${data.staleHours} 小时未联系`
                                : `已超过 ${data.staleHours} 小时未联系`}
                            >
                              超时
                            </span>
                          ) : null}
                        </div>
                        <small>
                          {item.leadTypeLabel}
                          {item.businessType ? ` · ${item.businessType}` : ''}
                          {showPhone && item.phone ? ` · ${item.phone}` : ''}
                        </small>
                      </div>
                      <div className="cms-row-actions">
                        {item.phone ? (
                          <button
                            className="cms-button"
                            type="button"
                            onClick={() => setRevealedPhoneId(showPhone ? '' : item.id)}
                          >
                            {showPhone ? '收起电话' : '查看电话'}
                          </button>
                        ) : null}
                        <Link className="cms-button" href={`/admin/collections/leads/${item.id}`}>详情</Link>
                        <button
                          className="cms-button cms-button--primary"
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void markLead(item.id, 'contacted')}
                        >
                          {busyId === item.id ? '…' : '已联系'}
                        </button>
                        <button
                          className="cms-button"
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void markLead(item.id, 'closed')}
                        >
                          已结束
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="cms-empty" style={{ padding: 24 }}>暂无待联系</div>
            )}
          </article>

          <div className="cms-ops-grid cms-ops-grid--funnel">
            <article className="cms-panel cms-ops-card">
              <h3>咨询漏斗</h3>
              <div className="cms-funnel">
                <FunnelBar label="全部提交" value={data.funnel.submitted} total={data.funnel.submitted} tone="#1d4ed8" />
                <FunnelBar label="待联系" value={data.funnel.new} total={data.funnel.submitted} tone="#2563eb" />
                <FunnelBar label="已联系" value={data.funnel.contacted} total={data.funnel.submitted} tone="#047857" />
                <FunnelBar label="已结束" value={data.funnel.closed} total={data.funnel.submitted} tone="#64748b" />
                <FunnelBar label="已生成房源" value={data.funnel.converted} total={data.funnel.submitted} tone="#b45309" />
              </div>
              <p className="cms-help" style={{ marginTop: 12 }}>
                联系推进率 {pct(data.funnel.contacted + data.funnel.closed, data.funnel.submitted)}%
                · 结束率 {pct(data.funnel.closed, data.funnel.submitted)}%
              </p>
            </article>
            <article className="cms-panel cms-ops-card">
              <h3>按业务线</h3>
              <div className="cms-table-wrap">
                <table className="cms-table" style={{ minWidth: 440 }}>
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
      ) : null}
    </main>
  )
}

export default OpsWorkbenchView
