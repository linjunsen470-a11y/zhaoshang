'use client'

import React, { useMemo, useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

function getFieldValue(fields: Record<string, { value?: unknown }>, name: string) {
  const value = fields?.[name]?.value
  return value === undefined || value === null ? '' : String(value)
}

function getRelationshipId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return ''
}

export const LeadQuickActions: React.FC = () => {
  const { id } = useDocumentInfo()
  const [message, setMessage] = useState('')
  const [converting, setConverting] = useState(false)
  const [syncingMerchant, setSyncingMerchant] = useState(false)

  const { phone, leadType, projectId, merchantProfileId } = useFormFields(([fields]) => ({
    phone: getFieldValue(fields, 'phone'),
    leadType: getFieldValue(fields, 'leadType'),
    projectId: getRelationshipId(fields.project?.value),
    merchantProfileId: getRelationshipId(fields.merchantProfile?.value),
  }))

  const canConvert = useMemo(() => Boolean(id) && leadType === 'transfer', [id, leadType])

  const showMessage = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 2600)
  }

  const onCopyPhone = async () => {
    if (!phone) {
      showMessage('当前线索没有联系电话')
      return
    }
    try {
      await navigator.clipboard.writeText(phone)
      showMessage('电话号码已复制')
    } catch {
      showMessage(`请手动复制：${phone}`)
    }
  }

  const onOpenProject = () => {
    if (!projectId) {
      showMessage('尚未关联招商项目')
      return
    }
    window.location.href = `/admin/collections/projects/${projectId}`
  }

  const onOpenMerchantProfile = () => {
    if (!merchantProfileId) {
      showMessage('尚未关联商户档案')
      return
    }
    window.location.href = `/admin/collections/merchant-profiles/${merchantProfileId}`
  }

  const onSyncMerchant = async () => {
    if (!id) {
      showMessage('请先保存线索后再沉淀档案')
      return
    }
    if (!phone) {
      showMessage('缺少联系电话，无法沉淀档案')
      return
    }
    if (!window.confirm('确认将当前线索沉淀为商户档案吗？同手机号将自动合并更新。')) return

    setSyncingMerchant(true)
    setMessage('')
    try {
      const res = await fetch(`/api/leads/${id}/sync-merchant`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showMessage(data.error || '沉淀档案失败')
        return
      }
      const open = window.confirm(
        data.created
          ? '已新建商户档案，是否立即打开？'
          : '已更新既有商户档案，是否立即打开？',
      )
      if (open && data.profileId) {
        window.location.href = `/admin/collections/merchant-profiles/${data.profileId}`
      } else {
        showMessage(data.created ? '商户档案已新建' : '商户档案已更新')
      }
    } catch (err) {
      console.error(err)
      showMessage('沉淀档案失败，请检查网络')
    } finally {
      setSyncingMerchant(false)
    }
  }

  const onConvertToProject = async () => {
    if (!id) {
      showMessage('请先保存线索后再转换')
      return
    }
    if (!canConvert) {
      showMessage('仅「店铺转让」类型线索可转为招商项目')
      return
    }
    if (!window.confirm('确认将该转让线索转为招商项目草稿吗？')) return

    setConverting(true)
    setMessage('')
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showMessage(data.error || '转换失败')
        return
      }
      const open = window.confirm(`已生成招商项目草稿：${data.projectTitle || data.projectId}\n是否立即打开项目编辑页？`)
      if (open && data.projectId) {
        window.location.href = `/admin/collections/projects/${data.projectId}`
      } else {
        showMessage('转换成功，项目已创建为草稿')
      }
    } catch (err) {
      console.error(err)
      showMessage('转换失败，请检查网络')
    } finally {
      setConverting(false)
    }
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: '4px',
    border: '1px solid var(--theme-elevation-150)',
    background: 'var(--theme-elevation-50)',
    color: 'var(--theme-text)',
    fontSize: '0.88rem',
    cursor: 'pointer',
  }

  const primaryStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'var(--theme-success-500, #2563eb)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
  }

  return (
    <div style={{
      margin: '0 0 20px',
      padding: '16px',
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: '6px',
      background: 'var(--theme-elevation-50)',
    }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--theme-text)' }}>
        快捷操作
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button type="button" style={buttonStyle} onClick={onCopyPhone}>复制电话</button>
        <button type="button" style={buttonStyle} onClick={onOpenProject} disabled={!projectId}>打开关联项目</button>
        <button type="button" style={buttonStyle} onClick={onOpenMerchantProfile} disabled={!merchantProfileId}>打开商户档案</button>
        <button
          type="button"
          style={{
            ...buttonStyle,
            opacity: syncingMerchant ? 0.7 : 1,
            cursor: syncingMerchant ? 'not-allowed' : 'pointer',
          }}
          onClick={onSyncMerchant}
          disabled={syncingMerchant}
        >
          {syncingMerchant ? '沉淀中...' : '沉淀为商户档案'}
        </button>
        <button
          type="button"
          style={{
            ...primaryStyle,
            opacity: canConvert ? 1 : 0.55,
            cursor: converting || !canConvert ? 'not-allowed' : 'pointer',
          }}
          onClick={onConvertToProject}
          disabled={converting || !canConvert}
        >
          {converting ? '转换中...' : '转为招商项目草稿'}
        </button>
      </div>
      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--theme-text)', opacity: 0.65 }}>
        「转为招商项目」仅适用于店铺转让线索，生成后需补充封面图并审核上线。
      </div>
      {message && (
        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--theme-success-500, #2563eb)' }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default LeadQuickActions