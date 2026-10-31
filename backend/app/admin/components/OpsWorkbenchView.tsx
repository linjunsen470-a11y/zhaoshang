'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type LeadTodo = {
  id: string
  name: string
  phone: string
  leadTypeLabel: string
  status: string
  createdAt?: string
  businessType?: string
  isStale: boolean
}

type WorkbenchData = {
  generatedAt: string
  staleHours: number
  team: {
    summary: {
      newLeads: number
      staleLeads: number
    }
    newLeads: LeadTodo[]
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

export function OpsWorkbenchView() {
  const [data, setData] = useState<WorkbenchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setData(await readJson<WorkbenchData>(await fetch('/api/admin/ops-workbench', { signal })))
      setError('')
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
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [load])

  const refresh = () => {
    setLoading(true)
    setError('')
    void load()
  }

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">团队运营</p>
          <h1>运营工作台</h1>
          <p>管理房源，跟进客户。</p>
        </div>
        <button className="cms-button" type="button" disabled={loading} onClick={refresh}>
          {loading ? '刷新中…' : '刷新数据'}
        </button>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      <section className="cms-start-grid" aria-label="日常操作">
        <Link className="cms-settings-card" href="/admin/collections/projects/create"><h2>录入房源</h2><p>添加项目或铺位，保存并上架。</p><span>新建记录 →</span></Link>
        <Link className="cms-settings-card" href="/admin/workspace/inquiries?status=new"><h2>客户咨询</h2><p>查看需求，记录联系进度。</p><span>查看待联系 →</span></Link>
        <Link className="cms-settings-card" href="/admin/workspace/share"><h2>分享房源</h2><p>获取分享文案和小程序码。</p><span>打开分享素材 →</span></Link>
      </section>
      {loading && !data ? <div className="cms-empty">工作台加载中…</div> : null}

      {data ? (
        <section className="cms-ops-section" aria-labelledby="ops-todo-title">
          <div className="cms-ops-section__head">
            <div>
              <h2 id="ops-todo-title">待联系咨询</h2>
              <p className="cms-help">按提交时间从早到晚显示，最多 8 条。超过 {data.staleHours} 小时的请优先处理。</p>
            </div>
            <div className="cms-ops-kpis">
              <div className="cms-ops-kpi"><span>待联系</span><strong>{data.team.summary.newLeads}</strong></div>
              <div className="cms-ops-kpi cms-ops-kpi--warn"><span>超过 {data.staleHours} 小时</span><strong>{data.team.summary.staleLeads}</strong></div>
            </div>
          </div>

          <article className="cms-panel cms-ops-card" style={{ marginBottom: 14 }}>
            <header>
              <Link href="/admin/workspace/inquiries?status=new">查看全部待联系咨询 →</Link>
            </header>
            {data.team.newLeads.length ? (
              <ul className="cms-ops-list">
                {data.team.newLeads.map(item => {
                  return (
                    <li key={item.id}>
                      <div className="cms-ops-lead">
                        <div className="cms-ops-lead__title">
                          <strong>{item.name}</strong>
                          {item.isStale ? (
                            <span
                              className="cms-ops-stale"
                              title={item.createdAt
                                ? `${dateFmt.format(new Date(item.createdAt))} 提交，已超过 ${data.staleHours} 小时未联系`
                                : `已超过 ${data.staleHours} 小时未联系`}
                            >
                              需优先联系
                            </span>
                          ) : null}
                        </div>
                        <small>
                          {item.leadTypeLabel}
                          {item.businessType ? ` · ${item.businessType}` : ''}
                          {item.createdAt ? ` · ${dateFmt.format(new Date(item.createdAt))} 提交` : ''}
                        </small>
                      </div>
                      <div className="cms-row-actions">
                        {item.phone ? (
                          <a className="cms-button" href={`tel:${item.phone}`}>拨打电话</a>
                        ) : null}
                        <Link className="cms-button cms-button--primary" href={`/admin/collections/leads/${item.id}`}>查看并处理</Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="cms-empty" style={{ padding: 24 }}>暂无待联系</div>
            )}
          </article>

        </section>
      ) : null}
    </main>
  )
}

export default OpsWorkbenchView
