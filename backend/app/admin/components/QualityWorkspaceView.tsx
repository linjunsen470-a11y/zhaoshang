'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type ProjectTodo = {
  id: string
  title: string
  status: string
  district?: string
  schoolName?: string
  missingFields: string[]
  ready: boolean
}

type QualityPayload = {
  generatedAt: string
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
  team: {
    readyToPublish: ProjectTodo[]
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

export function QualityWorkspaceView() {
  const [data, setData] = useState<QualityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      setData(await readJson<QualityPayload>(await fetch('/api/admin/ops-workbench', { signal })))
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '质量门禁加载失败')
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

  const q = data?.quality

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">房源质检</p>
          <h1>质量门禁</h1>
          <p>上架前必填项检查：标题、封面、类型、区域、费用、客群、详情图。</p>
        </div>
        <div className="cms-row-actions">
          <Link className="cms-button" href="/admin/collections/projects?quality=blocked">房源列表·未过门禁</Link>
          <button className="cms-button" type="button" disabled={loading} onClick={() => void load()}>
            {loading ? '刷新中…' : '刷新'}
          </button>
        </div>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {loading && !data ? <div className="cms-empty">加载中…</div> : null}

      {q ? (
        <>
          <div className="cms-ops-kpis" style={{ marginBottom: 18 }}>
            <div className="cms-ops-kpi cms-ops-kpi--ok"><span>齐全</span><strong>{q.readyCount}</strong></div>
            <div className="cms-ops-kpi cms-ops-kpi--warn"><span>未过门禁</span><strong>{q.blockedCount}</strong></div>
            <div className="cms-ops-kpi"><span>可上架草稿</span><strong>{q.readyToPublishCount}</strong></div>
            <div className="cms-ops-kpi cms-ops-kpi--danger"><span>已上架仍缺项</span><strong>{q.publicIncompleteCount}</strong></div>
          </div>

          <p className="cms-help" style={{ marginBottom: 16 }}>
            必填：{q.requiredFields.join('、')}。已扫描 {q.scanned}/{q.totalProjects} 套。
          </p>

          <section className="cms-panel cms-ops-card" style={{ marginBottom: 16 }}>
            <header>
              <h3>未过门禁</h3>
              <Link href="/admin/collections/projects?quality=blocked">在列表筛选</Link>
            </header>
            {q.blocked.length ? (
              <div className="cms-table-wrap">
                <table className="cms-table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>房源</th>
                      <th>状态</th>
                      <th>缺失项</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.blocked.map(item => (
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
            ) : <div className="cms-empty" style={{ padding: 28 }}>扫描范围内全部通过门禁</div>}
          </section>

          <section className="cms-panel cms-ops-card">
            <header>
              <h3>资料齐全可上架</h3>
              <Link href="/admin/collections/projects?quality=ready">在列表筛选</Link>
            </header>
            {data.team.readyToPublish.length ? (
              <ul className="cms-ops-list">
                {data.team.readyToPublish.map(item => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.schoolName || item.district || item.status}</small>
                    </div>
                    <Link className="cms-button cms-button--primary" href={`/admin/collections/projects/${item.id}`}>去上架</Link>
                  </li>
                ))}
              </ul>
            ) : <div className="cms-empty" style={{ padding: 24 }}>暂无待发布的完整草稿</div>}
          </section>
        </>
      ) : null}
    </main>
  )
}

export default QualityWorkspaceView
