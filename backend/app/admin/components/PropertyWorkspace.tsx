'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { DISTRICT_OPTIONS, PROPERTY_STATUS_OPTIONS, PROJECT_TYPE_OPTIONS } from '@/collections/shared/fieldOptions'

type Property = {
  id: string
  coverImage?: string
  title: string
  schoolName?: string
  opportunityType: string
  district?: string
  projectType?: string
  areaText?: string
  feeText?: string
  status: string
  isRecommended: boolean
  sort: number
  updatedAt?: number
  missingFields?: string[]
}

type ResponseData = { docs: Property[]; page: number; totalPages: number; totalDocs: number }

const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string; invalid?: Array<{ title?: string; missing?: string[] }> }
  if (!response.ok) {
    const detail = data.invalid?.map(item => `${item.title || '未命名房源'}缺少${item.missing?.join('、') || '必填资料'}`).join('；')
    throw new Error(detail ? `${data.error || '房源暂不能上架'}：${detail}` : data.error || '请求失败，请刷新后重试')
  }
  return data
}

export function PropertyWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const [data, setData] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [editing, setEditing] = useState<Property | null>(null)
  const [saving, setSaving] = useState(false)

  const updateParams = useCallback((changes: Record<string, string | undefined>) => {
    setLoading(true)
    const params = new URLSearchParams(queryString)
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!('page' in changes)) params.delete('page')
    router.push(`${pathname}${params.size ? `?${params}` : ''}`)
  }, [pathname, queryString, router])

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await readJson<ResponseData>(await fetch(`/api/admin/properties?${queryString}`, { signal }))
      const quality = new URLSearchParams(queryString).get('quality')
      const docs = !quality
        ? result.docs
        : result.docs.filter(item => quality === 'blocked'
          ? Boolean(item.missingFields?.length)
          : !item.missingFields?.length)
      setData({ ...result, docs })
      setSelected(new Set())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : '房源加载失败，请重试')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/admin/properties?${queryString}`, { signal: controller.signal })
      .then(response => readJson<ResponseData>(response))
      .then(result => {
        const quality = new URLSearchParams(queryString).get('quality')
        const docs = !quality
          ? result.docs
          : result.docs.filter(item => quality === 'blocked'
            ? Boolean(item.missingFields?.length)
            : !item.missingFields?.length)
        setData({ ...result, docs })
        setSelected(new Set())
        setError('')
      })
      .catch(err => { if (!(err instanceof DOMException && err.name === 'AbortError')) setError(err instanceof Error ? err.message : '房源加载失败，请重试') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [queryString])

  const allChecked = Boolean(data?.docs.length) && data?.docs.every(item => selected.has(item.id))
  useEffect(() => { if (!editing) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setEditing(null) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [editing])

  const toggleAll = () => {
    if (!data) return
    setSelected(allChecked ? new Set() : new Set(data.docs.map(item => item.id)))
  }

  const patchProperties = async (ids: string[], values: Record<string, unknown>, successMessage: string) => {
    setSaving(true)
    setError('')
    try {
      await readJson(await fetch('/api/admin/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data: values }),
      }))
      setMessage(successMessage)
      setEditing(null)
      await load()
      window.setTimeout(() => setMessage(''), 2400)
    } catch (err) {
      setError(err instanceof Error ? err.message : '房源更新失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const runBulk = async (values: Record<string, unknown>, label: string, destructive = false) => {
    const ids = [...selected]
    if (!ids.length) return
    if (destructive && !window.confirm(`确定要${label}选中的 ${ids.length} 套房源吗？`)) return
    await patchProperties(ids, values, `已${label} ${ids.length} 套房源`)
  }

  const submitQuickEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    void patchProperties([editing.id], {
      title: String(form.get('title') || ''),
      district: String(form.get('district') || ''),
      areaText: String(form.get('areaText') || ''),
      feeText: String(form.get('feeText') || ''),
      status: String(form.get('status') || 'draft'),
      sort: Number(form.get('sort') || 0),
      isRecommended: form.get('isRecommended') === 'on',
    }, '房源已保存')
  }

  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header">
        <div>
          <p className="cms-eyebrow">房源中心</p>
          <h1>房源管理</h1>
          <p>集中整理、快速修改并直接上下架校园商铺房源。</p>
        </div>
        <Link className="cms-button cms-button--primary" href="/admin/collections/projects/create">新建房源</Link>
      </header>

      <section className="cms-toolbar" aria-label="房源筛选">
        <form className="cms-search" onSubmit={event => { event.preventDefault(); updateParams({ q: search.trim() || undefined }) }}>
          <label className="cms-sr-only" htmlFor="property-search">搜索房源</label>
          <input id="property-search" name="q" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索标题、学校或地址…" autoComplete="off" />
          <button className="cms-button" type="submit">搜索</button>
        </form>
        <label><span>资料</span><select value={searchParams.get('quality') || ''} onChange={event => updateParams({ quality: event.target.value || undefined })}><option value="">全部</option><option value="blocked">还差资料</option><option value="ready">资料齐全</option></select></label>
        <label><span>业务</span><select value={searchParams.get('opportunityType') || ''} onChange={event => updateParams({ opportunityType: event.target.value || undefined })}><option value="">全部</option><option value="leasing">招商铺位</option><option value="transfer">店铺转让</option></select></label>
        <label><span>区域</span><select value={searchParams.get('district') || ''} onChange={event => updateParams({ district: event.target.value || undefined })}><option value="">全部</option>{DISTRICT_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>类型</span><select value={searchParams.get('projectType') || ''} onChange={event => updateParams({ projectType: event.target.value || undefined })}><option value="">全部</option>{PROJECT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>排序</span><select value={searchParams.get('sort') || '-updatedAt'} onChange={event => updateParams({ sort: event.target.value })}><option value="-updatedAt">最近修改</option><option value="-sort">推荐排序</option><option value="title">标题</option></select></label>
      </section>

      <nav className="cms-segments" aria-label="房源状态筛选">
        <button className={!searchParams.get('status') ? 'is-active' : ''} type="button" onClick={() => updateParams({ status: undefined })}>全部</button>
        {PROPERTY_STATUS_OPTIONS.map(item => <button className={searchParams.get('status') === item.value ? 'is-active' : ''} type="button" key={item.value} onClick={() => updateParams({ status: item.value })}>{item.label}</button>)}
      </nav>

      {selected.size ? <section className="cms-bulk" aria-label="批量操作"><strong>已选 {selected.size} 套</strong><button type="button" onClick={() => void runBulk({ status: 'online' }, '上架')}>上架</button><button type="button" onClick={() => void runBulk({ status: 'offline' }, '下架', true)}>下架</button><button type="button" onClick={() => void runBulk({ isRecommended: true }, '设为推荐')}>设为推荐</button><button type="button" onClick={() => void runBulk({ isRecommended: false }, '取消推荐')}>取消推荐</button></section> : null}
      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      <div className="cms-live" aria-live="polite">{message}</div>

      <section className="cms-panel">
        {loading && !data ? <div className="cms-empty">房源加载中…</div> : data?.docs.length ? (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th><input type="checkbox" aria-label="选择当前页全部房源" checked={allChecked} onChange={toggleAll} /></th><th>房源</th><th>业务/类型</th><th>区域</th><th>面积/费用</th><th>状态</th><th>更新</th><th>操作</th></tr></thead>
              <tbody>{data.docs.map(item => (
                <tr key={item.id}>
                  <td><input type="checkbox" aria-label={`选择 ${item.title}`} checked={selected.has(item.id)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} /></td>
                  <td><div className="cms-property"><div className="cms-property__image">{item.coverImage ? <Image src={item.coverImage} alt="" width={72} height={54} loading="lazy" unoptimized /> : <span>无图</span>}</div><div><Link href={`/admin/collections/projects/${item.id}`}>{item.title || '未命名房源'}</Link><small>{item.schoolName || '学校待补'}{item.isRecommended ? ' · 推荐' : ''}</small></div></div></td>
                  <td>{item.opportunityType === 'transfer' ? '店铺转让' : '招商铺位'}<small>{item.projectType || '类型待补'}</small></td>
                  <td>{item.district || '待补'}</td>
                  <td>{item.areaText || '面积待补'}<small>{item.feeText || '费用待补'}</small></td>
                  <td>
                    <span className={`cms-status cms-status--${item.status}`}>{PROPERTY_STATUS_OPTIONS.find(option => option.value === item.status)?.label || item.status}</span>
                    {item.missingFields?.length ? (
                      <div className="cms-gate-tags" style={{ marginTop: 6 }}>
                        {item.missingFields.slice(0, 4).map(field => (
                          <span className="cms-gate-tag cms-gate-tag--miss" key={field}>{field}</span>
                        ))}
                        {item.missingFields.length > 4 ? <span className="cms-gate-tag">+{item.missingFields.length - 4}</span> : null}
                      </div>
                    ) : (
                      <div className="cms-gate-tags" style={{ marginTop: 6 }}>
                        <span className="cms-gate-tag cms-gate-tag--ok">资料齐全</span>
                      </div>
                    )}
                  </td>
                  <td>{item.updatedAt ? dateFormatter.format(new Date(item.updatedAt)) : '—'}</td>
                  <td><div className="cms-row-actions"><button type="button" onClick={() => setEditing(item)}>快速修改</button><Link href={`/admin/collections/projects/${item.id}`}>完整编辑</Link></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="cms-empty"><h2>没有符合条件的房源</h2><p>调整筛选条件，或新建第一套房源。</p></div>}
      </section>

      {data && data.totalPages > 1 ? <nav className="cms-pagination" aria-label="房源分页"><span>共 {data.totalDocs} 套 · 第 {data.page}/{data.totalPages} 页</span><div><button type="button" disabled={data.page <= 1} onClick={() => updateParams({ page: String(data.page - 1) })}>上一页</button><button type="button" disabled={data.page >= data.totalPages} onClick={() => updateParams({ page: String(data.page + 1) })}>下一页</button></div></nav> : null}

      {editing ? <div className="cms-drawer-backdrop"><aside className="cms-drawer" role="dialog" aria-modal="true" aria-labelledby="quick-edit-title"><header><div><p className="cms-eyebrow">快速修改</p><h2 id="quick-edit-title">{editing.title}</h2></div><button className="cms-icon-button" type="button" aria-label="关闭快速修改" onClick={() => setEditing(null)}>×</button></header><form onSubmit={submitQuickEdit} className="cms-form"><label>房源标题<input name="title" defaultValue={editing.title} required autoComplete="off" /></label><div className="cms-form-grid"><label>区域<select name="district" defaultValue={editing.district || ''}><option value="">请选择</option>{DISTRICT_OPTIONS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>房源状态<select name="status" defaultValue={editing.status}>{PROPERTY_STATUS_OPTIONS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div><div className="cms-form-grid"><label>面积<input name="areaText" defaultValue={editing.areaText || ''} placeholder="例如：15m²…" autoComplete="off" /></label><label>排序权重<input name="sort" type="number" inputMode="numeric" defaultValue={editing.sort || 0} /></label></div><label>费用说明<input name="feeText" defaultValue={editing.feeText || ''} placeholder="例如：3 万元/年…" autoComplete="off" /></label><label className="cms-checkbox"><input name="isRecommended" type="checkbox" defaultChecked={editing.isRecommended} />重点推荐</label><div className="cms-drawer__actions"><button className="cms-button" type="button" onClick={() => setEditing(null)}>取消</button><button className="cms-button cms-button--primary" type="submit" disabled={saving}>{saving ? '保存中…' : '保存修改'}</button></div></form></aside></div> : null}
    </main>
  )
}

export default PropertyWorkspace
