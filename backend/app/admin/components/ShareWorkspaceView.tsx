'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PROPERTY_STATUS_OPTIONS } from '@/collections/shared/fieldOptions'
import { ShareMaterialPanel } from './ShareMaterialPanel'

type ShareProject = {
  id: string
  title: string
  status: string
  listingKind?: string
  businessScene?: string
  venueName?: string
  schoolName?: string
  schoolAlias?: string
  city?: string
  district?: string
  areaText?: string
  feeText?: string
  opportunityType?: string
  coverImage?: string
  path: string
  headline: string
  copyText: string
}

type SharePayload = {
  docs: ShareProject[]
  totalPages: number
  totalDocs: number
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

export function ShareWorkspaceView() {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [projects, setProjects] = useState<ShareProject[]>([])
  const [shareId, setShareId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await readJson<SharePayload>(await fetch(`/api/admin/share?${new URLSearchParams({ q: query, page: String(page) })}`, { signal }))
      if (signal?.aborted) return
      setProjects(data.docs)
      setTotalPages(data.totalPages)
      setTotalDocs(data.totalDocs)
      setShareId(prev => data.docs.some(item => item.id === prev) ? prev : data.docs[0]?.id || '')
      setError('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '分享素材加载失败')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [query, page])

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

  const selected = projects.find(p => p.id === shareId) || projects[0]

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">分享推广</p>
          <h1>分享素材</h1>
          <p>选择已公开的项目或铺位，复制分享文案并生成海报。</p>
        </div>
        <div className="cms-row-actions">
        <Link className="cms-button" href="/admin/collections/projects">返回项目与铺位</Link>
        <button className="cms-button" type="button" disabled={loading} onClick={refresh}>
          {loading ? '刷新中…' : '刷新房源'}
        </button>
        </div>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {loading && !projects.length ? <div className="cms-empty">加载中…</div> : null}

      <div className="cms-ops-grid cms-ops-grid--share">
        <article className="cms-panel cms-ops-card">
          <h3>已公开的项目与铺位</h3>
          <p className="cms-help">共 {totalDocs} 条公开记录，包含即将开放和已满/已转。</p>
          <form className="cms-row-actions" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(draft.trim()); }}>
            <input aria-label="搜索分享房源" placeholder="搜索标题、场所或地址" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)} />
            <button className="cms-button" type="submit" disabled={loading}>搜索</button>
          </form>
          <div className="cms-row-actions">
            <button className="cms-button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>上一页</button>
            <span aria-live="polite">第 {page} / {Math.max(1, totalPages)} 页</span>
            <button className="cms-button" disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>下一页</button>
          </div>
          {projects.length ? (
            <ul className="cms-ops-list">
              {projects.map(item => (
                <li key={item.id} className={selected?.id === item.id ? 'is-active' : undefined}>
                  <button type="button" className="cms-ops-select" onClick={() => setShareId(item.id)}>
                    <strong>{item.title}</strong>
                    <small>
                      {item.schoolName || item.district || PROPERTY_STATUS_OPTIONS.find(option => option.value === item.status)?.label || '已公开'}
                      {item.coverImage ? ' · 有封面' : ' · 无封面'}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <div className="cms-empty" style={{ padding: 24 }}>没有匹配的公开房源，请调整搜索条件或先完成上架。</div>
          )}
        </article>

        <article className="cms-panel cms-ops-card">
          {selected ? (
            <ShareMaterialPanel
              key={selected.id}
              project={{
                id: selected.id,
                title: selected.title,
                listingKind: selected.listingKind,
                businessScene: selected.businessScene,
                venueName: selected.venueName,
                schoolName: selected.schoolName,
                schoolAlias: selected.schoolAlias,
                city: selected.city,
                district: selected.district,
                areaText: selected.areaText,
                feeText: selected.feeText,
                opportunityType: selected.opportunityType,
                status: selected.status,
                coverImage: selected.coverImage,
              }}
            />
          ) : (
            <div className="cms-empty" style={{ padding: 24 }}>请选择左侧房源，查看可用的分享素材。</div>
          )}
        </article>
      </div>
    </main>
  )
}

export default ShareWorkspaceView
