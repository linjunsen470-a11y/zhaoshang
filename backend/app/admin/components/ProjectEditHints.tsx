'use client'

import { useDocumentInfo, useForm, useFormFields, useFormModified, useFormProcessing } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function fieldValue(fields: Record<string, { value?: unknown }>, name: string) { return fields[name]?.value }
function hasValue(value: unknown) { return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '' }

export function ProjectEditHints() {
  const { id } = useDocumentInfo(); const { submit } = useForm(); const modified = useFormModified(); const processing = useFormProcessing(); const fields = useFormFields(([allFields]) => allFields); const [message, setMessage] = useState('')
  const checks = [{ key: 'title', label: '房源标题' }, { key: 'coverImage', label: '封面图' }, { key: 'projectType', label: '房源类型' }, { key: 'district', label: '区域' }, { key: 'feeText', label: '费用说明' }, { key: 'customerInfo', label: '客群说明' }, { key: 'images', label: '详情图片' }].map(item => ({ ...item, ok: hasValue(fieldValue(fields, item.key)) }))
  const missing = checks.filter(item => !item.ok)
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (!modified) return; event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [modified])
  const saveStatus = async (status: 'online' | 'offline') => { if (status === 'online' && missing.length) { setMessage(`请先补充：${missing.map(item => item.label).join('、')}`); return } setMessage(''); try { await submit({ overrides: { status } }); setMessage(status === 'online' ? '房源已上架' : '房源已下架') } catch { setMessage('保存失败，请检查页面错误后重试') } }
  const detailPath = id ? `/pages/detail/detail?id=${id}` : ''
  return <div className="cms-editor-panel"><section><h3>发布检查</h3><span className={`cms-status ${missing.length ? 'cms-status--draft' : 'cms-status--online'}`}>{missing.length ? `还差 ${missing.length} 项` : '可以上架'}</span><ul>{checks.map(item => <li key={item.key}><span>{item.label}</span><strong className={item.ok ? 'is-done' : ''}>{item.ok ? '完成' : '待补'}</strong></li>)}</ul></section><div className="cms-editor-actions"><button className="cms-button cms-button--primary" type="button" disabled={processing} onClick={() => void saveStatus('online')}>{processing ? '保存中…' : '保存并上架'}</button><button className="cms-button" type="button" disabled={processing} onClick={() => void saveStatus('offline')}>保存并下架</button><Link className="cms-button" href="/admin/collections/projects">返回房源列表</Link>{detailPath ? <button className="cms-button" type="button" onClick={() => void navigator.clipboard.writeText(detailPath).then(() => setMessage('小程序路径已复制'))}>复制小程序路径</button> : null}</div><div className="cms-live" aria-live="polite">{message}</div></div>
}

export default ProjectEditHints
