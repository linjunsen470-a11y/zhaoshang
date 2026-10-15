'use client'

import { useDocumentInfo, useForm, useFormFields, useFormModified, useFormProcessing } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShareMaterialPanel } from './ShareMaterialPanel'

function fieldValue(fields: Record<string, { value?: unknown }>, name: string) {
  return fields[name]?.value
}

function hasValue(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== ''
}

const CHECKS = [
  { key: 'title', label: '房源标题' },
  { key: 'coverImage', label: '封面图' },
  { key: 'businessScene', label: '商业场景' },
  { key: 'district', label: '区域' },
  { key: 'feeText', label: '费用说明' },
  { key: 'customerInfo', label: '客群说明' },
  { key: 'images', label: '详情图片' },
] as const

export function ProjectEditHints() {
  const { id } = useDocumentInfo()
  const { submit, dispatchFields, setModified } = useForm()
  const searchParams = useSearchParams()
  const parentId = searchParams.get('parentProject')
  const initializedParent = useRef<string | null>(null)
  const modified = useFormModified()
  const processing = useFormProcessing()
  const fields = useFormFields(([allFields]) => allFields)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (id || !parentId || initializedParent.current === parentId) return
    const controller = new AbortController()
    fetch(`/api/projects/${encodeURIComponent(parentId)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('无法读取所属项目'); return response.json() })
      .then(parent => {
        if (parent.listingKind !== 'project') throw new Error('所属项目不是整项目招商')
        for (const [path, value] of Object.entries({ listingKind: 'unit', parentProject: Number(parent.id), businessScene: parent.businessScene, city: parent.city, district: parent.district })) {
          dispatchFields({ type: 'UPDATE', path, value })
        }
        setModified(true)
        initializedParent.current = parentId
      })
      .catch(error => { if (error.name !== 'AbortError') setMessage(error.message) })
    return () => controller.abort()
  }, [id, parentId, dispatchFields, setModified])

  const checks = CHECKS.map(item => ({
    ...item,
    ok: hasValue(fieldValue(fields, item.key)) || (item.key === 'businessScene' && Boolean(fieldValue(fields, 'legacyUnclassified'))),
  }))
  const missing = checks.filter(item => !item.ok)

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!modified) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [modified])

  const saveStatus = async (status: 'online' | 'offline') => {
    if (status === 'online' && missing.length) {
      setMessage(`请先补充：${missing.map(item => item.label).join('、')}`)
      return
    }
    setMessage('')
    try {
      await submit({ overrides: { status } })
      setMessage(status === 'online' ? '房源已上架' : '房源已下架')
    } catch {
      setMessage('保存失败，请检查页面错误后重试')
    }
  }

  const title = String(fieldValue(fields, 'title') || '')
  const schoolName = String(fieldValue(fields, 'venueName') || fieldValue(fields, 'schoolName') || '')
  const district = String(fieldValue(fields, 'district') || '')
  const areaText = String(fieldValue(fields, 'areaText') || '')
  const feeText = String(fieldValue(fields, 'feeText') || '')
  const opportunityType = String(fieldValue(fields, 'opportunityType') || '')

  return (
    <div className="cms-editor-panel">
      <section>
        <h3>上架前检查</h3>
        <p>面积与月租请填相同上下限或完整范围，未知可留空。整项目面积指可招商单元范围。</p>
        {id && fieldValue(fields, 'listingKind') === 'project' ? <><Link className="cms-button" href={`/admin/collections/projects/create?parentProject=${id}`}>新增所属铺位</Link><Link className="cms-button" href={`/admin/collections/projects?parentProject=${id}`}>查看所属铺位</Link><p>项目已满时请检查各铺位状态；下架项目将暂停展示关联铺位。</p></> : null}
        <span className={`cms-status ${missing.length ? 'cms-status--draft' : 'cms-status--online'}`}>
          {missing.length ? `还差 ${missing.length} 项` : '可以上架'}
        </span>
        <ul>
          {checks.map(item => (
            <li key={item.key}>
              <span>{item.label}</span>
              <strong className={item.ok ? 'is-done' : ''}>{item.ok ? '完成' : '待补'}</strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="cms-editor-actions">
        <button className="cms-button cms-button--primary" type="button" disabled={processing} onClick={() => void saveStatus('online')}>
          {processing ? '保存中…' : '保存并上架'}
        </button>
        <button className="cms-button" type="button" disabled={processing} onClick={() => void saveStatus('offline')}>
          保存并下架
        </button>
        <Link className="cms-button" href="/admin/collections/projects">返回房源列表</Link>
      </div>

      {id ? (
        <ShareMaterialPanel
          key={String(id)}
          project={{
            id,
            title,
            listingKind: String(fieldValue(fields, 'listingKind') || 'unit'),
            schoolName,
            district,
            areaText,
            feeText,
            opportunityType,
          }}
        />
      ) : null}

      <div className="cms-live" aria-live="polite">{message}</div>
    </div>
  )
}

export default ProjectEditHints
