'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

function fieldValue(fields: Record<string, { value?: unknown }>, name: string) { return fields[name]?.value }
function relationId(value: unknown) { if (typeof value === 'string' || typeof value === 'number') return String(value); if (value && typeof value === 'object' && 'id' in value) return String((value as { id?: string | number }).id || ''); return '' }

export function InquiryActions() {
  const { id } = useDocumentInfo(); const fields = useFormFields(([allFields]) => allFields); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  const phone = String(fieldValue(fields, 'phone') || ''); const leadType = String(fieldValue(fields, 'leadType') || ''); const generatedProject = relationId(fieldValue(fields, 'generatedProject'))
  const createProperty = async () => { if (!id || leadType !== 'transfer' || generatedProject) return; setBusy(true); setMessage(''); try { const response = await fetch(`/api/admin/inquiries/${id}/create-property`, { method: 'POST' }); const payload = await response.json() as { error?: string; projectId?: string }; if (!response.ok) throw new Error(payload.error || '生成房源失败'); setMessage('房源草稿已生成，正在打开…'); window.location.assign(`/admin/collections/projects/${payload.projectId}`) } catch (error) { setMessage(error instanceof Error ? error.message : '生成房源失败') } finally { setBusy(false) } }
  return <section className="cms-inline-card"><h3>联系与房源</h3><div className="cms-row-actions">{phone ? <a className="cms-button" href={`tel:${phone}`}>拨打 {phone}</a> : null}{generatedProject ? <a className="cms-button cms-button--primary" href={`/admin/collections/projects/${generatedProject}`}>打开已生成房源</a> : leadType === 'transfer' && id ? <button className="cms-button cms-button--primary" type="button" disabled={busy} onClick={() => void createProperty()}>{busy ? '生成中…' : '生成房源草稿'}</button> : null}</div><div className="cms-live" aria-live="polite">{message}</div></section>
}

export default InquiryActions
