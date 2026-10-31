'use client'

import { useDocumentInfo, useForm, useFormFields, useFormModified } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getProjectMissingFields } from '@/lib/cmsRules.mjs'

function fieldValue(fields: Record<string, { value?: unknown }>, name: string) {
  return fields[name]?.value
}

export function ProjectEditHints() {
  const { id } = useDocumentInfo()
  const { dispatchFields, setModified } = useForm()
  const searchParams = useSearchParams()
  const parentId = searchParams.get('parentProject')
  const initializedParent = useRef<string | null>(null)
  const modified = useFormModified()
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

  const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]))
  const missing = getProjectMissingFields(values)

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!modified) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [modified])

  return (
    <div className="cms-editor-panel">
      {String(values.seedKey || '').startsWith('tencent:') ? <section><h3>腾讯文档同步房源</h3><p>业务资料请在腾讯文档修改。后台保留推荐、排序、内部备注及紧急停止公开。</p><a href="https://docs.qq.com/desktop/" target="_blank" rel="noreferrer">打开腾讯文档</a></section> : null}
      <section>
        <h3>填写与保存</h3>
        <p>填完必填资料后，保留草稿或选择下方的公开状态，再点击页面的保存按钮。</p>
        <span className={`cms-status ${missing.length ? 'cms-status--draft' : 'cms-status--online'}`}>
          {missing.length ? `还差 ${missing.length} 项必填` : '基本资料已填齐'}
        </span>
        <p>{missing.length ? `待补：${missing.join('、')}。` : '请核实图片可公开、面积和月租范围正确，再上架。'}</p>
        {modified ? <p className="cms-warning">有未保存的修改，当前选择尚未生效。</p> : null}
      </section>

      <div className="cms-editor-actions">
        <Link className="cms-button" href="/admin/collections/projects">返回项目与铺位</Link>
      </div>

      {id && fieldValue(fields, 'listingKind') === 'project' && !modified ? <section><h3>这个项目的铺位</h3><Link className="cms-button" href={`/admin/collections/projects/create?parentProject=${id}`}>新增所属铺位</Link><Link className="cms-button" href={`/admin/collections/projects?parentProject=${id}`}>查看所属铺位</Link><p>项目下架时，所属铺位也会暂停公开。</p></section> : null}

      <div className="cms-live" aria-live="polite">{message}</div>
    </div>
  )
}

export default ProjectEditHints
