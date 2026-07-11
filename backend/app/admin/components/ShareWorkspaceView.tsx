'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShareMaterialPanel } from './ShareMaterialPanel'

type ShareProject = {
  id: string
  title: string
  status: string
  schoolName?: string
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
  share: { projects: ShareProject[] }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

export function ShareWorkspaceView() {
  const [projects, setProjects] = useState<ShareProject[]>([])
  const [shareId, setShareId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await readJson<SharePayload>(await fetch('/api/admin/ops-workbench', { signal }))
      setProjects(data.share.projects)
      setShareId(prev => prev || data.share.projects[0]?.id || '')
      setError('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '分享素材加载失败')
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

  const selected = projects.find(p => p.id === shareId) || projects[0]

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">获客投放</p>
          <h1>分享素材</h1>
          <p>复制分享文案，生成带房源图与真实微信小程序码的海报。</p>
        </div>
        <button className="cms-button" type="button" disabled={loading} onClick={refresh}>
          {loading ? '刷新中…' : '刷新房源'}
        </button>
      </header>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {loading && !projects.length ? <div className="cms-empty">加载中…</div> : null}

      <div className="cms-ops-grid cms-ops-grid--share">
        <article className="cms-panel cms-ops-card">
          <h3>开放中房源</h3>
          {projects.length ? (
            <ul className="cms-ops-list">
              {projects.map(item => (
                <li key={item.id} className={selected?.id === item.id ? 'is-active' : undefined}>
                  <button type="button" className="cms-ops-select" onClick={() => setShareId(item.id)}>
                    <strong>{item.title}</strong>
                    <small>
                      {item.schoolName || item.district || item.status}
                      {item.coverImage ? ' · 有封面' : ' · 无封面'}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <div className="cms-empty" style={{ padding: 24 }}>暂无开放中房源，请先上架。</div>
          )}
        </article>

        <article className="cms-panel cms-ops-card">
          {selected ? (
            <ShareMaterialPanel
              key={selected.id}
              project={{
                id: selected.id,
                title: selected.title,
                schoolName: selected.schoolName,
                district: selected.district,
                areaText: selected.areaText,
                feeText: selected.feeText,
                opportunityType: selected.opportunityType,
                status: selected.status,
                coverImage: selected.coverImage,
              }}
            />
          ) : (
            <div className="cms-empty" style={{ padding: 24 }}>请选择左侧房源</div>
          )}
        </article>
      </div>
    </main>
  )
}

export default ShareWorkspaceView
