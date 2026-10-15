'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PROPERTY_STATUS_OPTIONS } from '@/collections/shared/fieldOptions'

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
    truncated: boolean
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
    try {
      setData(await readJson<QualityPayload>(await fetch('/api/admin/ops-workbench', { signal })))
      setError('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '上架检查加载失败')
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

  const q = data?.quality

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">上架前核对</p>
          <h1>上架检查</h1>
          <p>核对公开前的基本资料。必填已齐仍需确认图片可公开、面积和月租范围正确。</p>
        </div>
        <div className="cms-row-actions">
          <Link className="cms-button" href="/admin/collections/projects">返回项目与铺位</Link>
          <Link className="cms-button" href="/admin/collections/projects?quality=blocked">查看资料不全的房源</Link>
          <button className="cms-button" type="button" disabled={loading} onClick={refresh}>
            {loading ? '刷新中…' : '刷新'}
          </button>
        </div>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {data?.quality.truncated ? (
        <div className="cms-alert" role="alert">房源超过 500 条；当前页面仅展示首批检查结果，真正上架仍由保存时的完整校验拦截。</div>
      ) : null}
      {loading && !data ? <div className="cms-empty">加载中…</div> : null}

      {q ? (
        <>
          <div className="cms-ops-kpis" style={{ marginBottom: 18 }}>
            <div className="cms-ops-kpi cms-ops-kpi--ok"><span>资料齐全</span><strong>{q.readyCount}</strong></div>
            <div className="cms-ops-kpi cms-ops-kpi--warn"><span>还差资料</span><strong>{q.blockedCount}</strong></div>
            <div className="cms-ops-kpi"><span>可以上架</span><strong>{q.readyToPublishCount}</strong></div>
            <div className="cms-ops-kpi cms-ops-kpi--danger"><span>已上架但缺资料</span><strong>{q.publicIncompleteCount}</strong></div>
          </div>

          <p className="cms-help" style={{ marginBottom: 16 }}>
            需要准备：{q.requiredFields.join('、')}。当前已检查 {q.scanned}/{q.totalProjects} 套。
          </p>

          <section className="cms-panel cms-ops-card" style={{ marginBottom: 16 }}>
            <header>
              <h3>还差资料的房源</h3>
              <Link href="/admin/collections/projects?quality=blocked">在列表筛选</Link>
            </header>
            {q.blocked.length ? (
              <div className="cms-table-wrap">
                <table className="cms-table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>房源</th>
                      <th>状态</th>
                      <th>还差什么</th>
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
                        <td><span className={`cms-status cms-status--${item.status}`}>{PROPERTY_STATUS_OPTIONS.find(option => option.value === item.status)?.label || '未知状态'}</span></td>
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
            ) : <div className="cms-empty" style={{ padding: 28 }}>当前检查范围内没有缺资料的房源。</div>}
          </section>

          <section className="cms-panel cms-ops-card">
            <header>
              <h3>必填已齐，待确认上架</h3>
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
            ) : <div className="cms-empty" style={{ padding: 24 }}>暂无资料齐全的待发布草稿。</div>}
          </section>
        </>
      ) : null}
    </main>
  )
}

export default QualityWorkspaceView
