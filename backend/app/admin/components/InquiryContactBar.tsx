'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'
import { LEAD_STATUS_OPTIONS, LEAD_TYPE_LABELS, categoryForLeadType } from '@/collections/shared/fieldOptions'

function fieldValue(fields: Record<string, { value?: unknown }>, name: string) {
  return fields[name]?.value
}

function relationId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id?: string | number }).id || '')
  }
  return ''
}

function relationTitle(value: unknown) {
  if (value && typeof value === 'object' && 'title' in value) {
    const title = (value as { title?: unknown }).title
    if (typeof title === 'string' && title.trim()) return title
  }
  return ''
}

const STATUS_TONE: Record<string, string> = Object.fromEntries(
  LEAD_STATUS_OPTIONS.map(item => [item.value, item.tone]),
)

export function InquiryContactBar() {
  const { id } = useDocumentInfo()
  const fields = useFormFields(([allFields]) => allFields)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const name = String(fieldValue(fields, 'name') || '未填写称呼')
  const phone = String(fieldValue(fields, 'phone') || '')
  const leadType = String(fieldValue(fields, 'leadType') || '')
  const status = String(fieldValue(fields, 'status') || 'new')
  const project = fieldValue(fields, 'project')
  const projectId = relationId(project)
  const projectTitle = relationTitle(project) || String(fieldValue(fields, 'projectTitle') || '')
  const generatedProject = relationId(fieldValue(fields, 'generatedProject'))
  const category = categoryForLeadType(leadType)
  const typeLabel = LEAD_TYPE_LABELS[leadType] || leadType || '未分类'
  const statusLabel = LEAD_STATUS_OPTIONS.find(item => item.value === status)?.label || status
  const statusTone = STATUS_TONE[status] || '#64748b'
  const categoryLabel = category === 'property' ? '房源' : category === 'equipment' ? '设备' : category === 'renovation' ? '装修' : ''

  const copyPhone = async () => {
    if (!phone) return
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setMessage('复制失败，请手动选择号码')
    }
  }

  const createProperty = async () => {
    if (!id || leadType !== 'transfer' || generatedProject) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/inquiries/${id}/create-property`, { method: 'POST' })
      const payload = await response.json() as { error?: string; projectId?: string }
      if (!response.ok) throw new Error(payload.error || '生成房源失败')
      setMessage('房源草稿已生成，正在打开…')
      window.location.assign(`/admin/collections/projects/${payload.projectId}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '生成房源失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cms-contact-bar" aria-label="联系与快捷操作">
      <div className="cms-contact-bar__main">
        <div className="cms-contact-bar__identity">
          <div className="cms-contact-bar__avatar" aria-hidden="true">
            {(name.trim()[0] || '客').slice(0, 1)}
          </div>
          <div className="cms-contact-bar__text">
            <div className="cms-contact-bar__title-row">
              <h3 className="cms-contact-bar__name">{name}</h3>
              {categoryLabel ? <span className="cms-contact-bar__chip">{categoryLabel}</span> : null}
              <span className="cms-contact-bar__chip cms-contact-bar__chip--type">{typeLabel}</span>
              <span
                className="cms-contact-bar__status"
                style={{ background: `color-mix(in srgb, ${statusTone} 14%, transparent)`, color: statusTone }}
              >
                {statusLabel}
              </span>
            </div>
            <p className="cms-contact-bar__phone-line">
              {phone ? (
                <>
                  <a className="cms-contact-bar__phone" href={`tel:${phone}`}>{phone}</a>
                  <span className="cms-contact-bar__hint">点击号码可拨打 · 沟通请在微信或电话完成</span>
                </>
              ) : (
                <span className="cms-contact-bar__hint">未填写联系电话</span>
              )}
            </p>
            {projectId ? (
              <p className="cms-contact-bar__meta">
                关联房源：
                <a href={`/admin/collections/projects/${projectId}`}>
                  {projectTitle || `房源 #${projectId}`}
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div className="cms-contact-bar__actions">
          {phone ? (
            <>
              <a className="cms-button cms-button--primary" href={`tel:${phone}`}>拨打电话</a>
              <button className="cms-button" type="button" onClick={() => void copyPhone()}>
                {copied ? '已复制' : '复制号码'}
              </button>
            </>
          ) : null}
          {projectId ? (
            <a className="cms-button" href={`/admin/collections/projects/${projectId}`}>打开关联房源</a>
          ) : null}
          {generatedProject ? (
            <a className="cms-button cms-button--primary" href={`/admin/collections/projects/${generatedProject}`}>
              打开已生成房源
            </a>
          ) : leadType === 'transfer' && id ? (
            <button className="cms-button cms-button--primary" type="button" disabled={busy} onClick={() => void createProperty()}>
              {busy ? '生成中…' : '生成房源草稿'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="cms-live" aria-live="polite">{message}</div>
    </section>
  )
}

export default InquiryContactBar
