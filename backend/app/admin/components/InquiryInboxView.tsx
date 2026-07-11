'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import {
  LEAD_CATEGORY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_LABELS,
  categoryForLeadType,
} from '@/collections/shared/fieldOptions'

type Inquiry = {
  id: string
  name: string
  phone: string
  leadType: string
  status: string
  businessType: string
  budgetRange: string
  regionPreference: string
  remark: string
  internalNote: string
  project: { id: string; title: string } | null
  generatedProject: { id: string; title: string } | null
  createdAt?: string
}

type ResponseData = { docs: Inquiry[]; page: number; totalPages: number; totalDocs: number }

const formatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string; detail?: string }
  if (!response.ok) {
    const base = data.error || `请求失败（${response.status}）`
    throw new Error(data.detail ? `${base}：${data.detail}` : base)
  }
  return data
}

const CATEGORY_SEGMENTS = [
  { value: '', label: '全部' },
  ...LEAD_CATEGORY_OPTIONS.map(item => ({ value: item.value, label: item.label })),
]

export function InquiryInboxView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  const [data, setData] = useState<ResponseData | null>(null)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Inquiry | null>(null)
  const [saving, setSaving] = useState(false)

  const activeCategory = searchParams.get('category') || ''

  const updateParams = useCallback((changes: Record<string, string | undefined>) => {
    setLoading(true)
    const params = new URLSearchParams(query)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    if (!('page' in changes)) params.delete('page')
    router.push(`${pathname}${params.size ? `?${params}` : ''}`)
  }, [pathname, query, router])

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      setData(await json<ResponseData>(await fetch(`/api/admin/inquiries?${query}`, { signal })))
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '咨询加载失败')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    if (!editing) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [editing])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError('')
    try {
      await json(await fetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          status: form.get('status'),
          internalNote: form.get('internalNote'),
        }),
      }))
      setMessage('咨询处理状态已保存')
      setEditing(null)
      await load()
      window.setTimeout(() => setMessage(''), 2400)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const categoryMeta = LEAD_CATEGORY_OPTIONS.find(item => item.value === activeCategory)
  const typeFilterOptions = categoryMeta
    ? Object.entries(LEAD_TYPE_LABELS).filter(([value]) => (categoryMeta.types as readonly string[]).includes(value))
    : Object.entries(LEAD_TYPE_LABELS)

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">客户咨询</p>
          <h1>咨询收件箱</h1>
          <p>处理小程序提交的咨询。先按业务线筛选，再快速改状态或进入完整详情。</p>
        </div>
      </header>

      <nav className="cms-segments" aria-label="咨询业务线">
        {CATEGORY_SEGMENTS.map(item => {
          const active = activeCategory === item.value
          return (
            <button
              key={item.value || 'all'}
              type="button"
              className={active ? 'is-active' : undefined}
              onClick={() => updateParams({
                category: item.value || undefined,
                leadType: undefined,
              })}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {categoryMeta ? (
        <p className="cms-help" style={{ marginBottom: 14 }}>
          {categoryMeta.label}：{categoryMeta.description}
          {activeCategory === 'equipment' ? ' · 要在小程序展示时，再到侧栏「设备上架」发布。' : null}
        </p>
      ) : null}

      <section className="cms-toolbar">
        <form
          className="cms-search"
          onSubmit={event => {
            event.preventDefault()
            updateParams({ q: search.trim() || undefined })
          }}
        >
          <label className="cms-sr-only" htmlFor="inquiry-search">搜索咨询</label>
          <input
            id="inquiry-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="搜索称呼、电话或需求…"
            autoComplete="off"
          />
          <button className="cms-button" type="submit">搜索</button>
        </form>
        <label>
          <span>状态</span>
          <select
            value={searchParams.get('status') || ''}
            onChange={event => updateParams({ status: event.target.value || undefined })}
          >
            <option value="">全部</option>
            {LEAD_STATUS_OPTIONS.map(item => (
              <option value={item.value} key={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>类型</span>
          <select
            value={searchParams.get('leadType') || ''}
            onChange={event => updateParams({ leadType: event.target.value || undefined })}
          >
            <option value="">全部</option>
            {typeFilterOptions.map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
      </section>

      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      <div className="cms-live" aria-live="polite">{message}</div>

      <section className="cms-panel">
        {loading && !data ? (
          <div className="cms-empty">咨询加载中…</div>
        ) : data?.docs.length ? (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>客户</th>
                  <th>业务线 / 类型</th>
                  <th>需求摘要</th>
                  <th>关联房源</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.docs.map(item => {
                  const category = categoryForLeadType(item.leadType)
                  const categoryLabel = category === 'property' ? '房源' : category === 'equipment' ? '设备' : category === 'renovation' ? '装修' : '其他'
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name || '未填写称呼'}</strong>
                        <small><a href={`tel:${item.phone}`}>{item.phone}</a></small>
                      </td>
                      <td>
                        {categoryLabel} · {LEAD_TYPE_LABELS[item.leadType] || item.leadType}
                      </td>
                      <td>
                        <small>
                          {[item.businessType, item.budgetRange, item.regionPreference].filter(Boolean).join(' · ') || '暂无补充'}
                        </small>
                      </td>
                      <td>
                        {item.project?.id ? (
                          <Link href={`/admin/collections/projects/${item.project.id}`}>
                            {item.project.title || '关联房源'}
                          </Link>
                        ) : item.generatedProject?.id ? (
                          <Link href={`/admin/collections/projects/${item.generatedProject.id}`}>
                            已生成房源
                          </Link>
                        ) : (
                          <small>—</small>
                        )}
                      </td>
                      <td>
                        <span className={`cms-status cms-status--${item.status}`}>
                          {LEAD_STATUS_OPTIONS.find(s => s.value === item.status)?.label || item.status}
                        </span>
                      </td>
                      <td>
                        <small>{item.createdAt ? formatter.format(new Date(item.createdAt)) : '—'}</small>
                      </td>
                      <td>
                        <div className="cms-row-actions">
                          <button type="button" onClick={() => setEditing(item)}>快速处理</button>
                          <Link href={`/admin/collections/leads/${item.id}`}>完整详情</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cms-empty">当前筛选下暂无咨询。</div>
        )}

        {data && data.totalPages > 1 ? (
          <div className="cms-pagination">
            <div>共 {data.totalDocs} 条 · 第 {data.page}/{data.totalPages} 页</div>
            <button type="button" disabled={data.page <= 1} onClick={() => updateParams({ page: String(data.page - 1) })}>上一页</button>
            <button type="button" disabled={data.page >= data.totalPages} onClick={() => updateParams({ page: String(data.page + 1) })}>下一页</button>
          </div>
        ) : null}
      </section>

      {editing ? (
        <div className="cms-drawer-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="cms-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-edit-title"
            onClick={event => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="cms-eyebrow">快速处理</p>
                <h2 id="inquiry-edit-title">{editing.name || '咨询'}</h2>
                <p>{editing.phone} · {LEAD_TYPE_LABELS[editing.leadType] || editing.leadType}</p>
              </div>
              <button className="cms-icon-button" type="button" aria-label="关闭" onClick={() => setEditing(null)}>×</button>
            </header>
            <form className="cms-form" onSubmit={event => void save(event)}>
              <label>
                <span>处理状态</span>
                <select name="status" defaultValue={editing.status} required>
                  {LEAD_STATUS_OPTIONS.map(item => (
                    <option value={item.value} key={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>内部备注</span>
                <textarea name="internalNote" rows={4} defaultValue={editing.internalNote || ''} placeholder="仅后台可见…" />
              </label>
              <div className="cms-drawer__actions">
                <Link className="cms-button" href={`/admin/collections/leads/${editing.id}`}>打开完整详情</Link>
                <button className="cms-button" type="button" onClick={() => setEditing(null)}>取消</button>
                <button className="cms-button cms-button--primary" type="submit" disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default InquiryInboxView
