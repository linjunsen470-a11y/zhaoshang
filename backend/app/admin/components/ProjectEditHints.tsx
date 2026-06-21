'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

export const ProjectEditHints: React.FC = () => {
  const { id } = useDocumentInfo()
  const [message, setMessage] = useState('')

  if (!id) {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--theme-text)', opacity: 0.7 }}>
        保存项目后可复制小程序详情页路径。
      </div>
    )
  }

  const detailPath = `/pages/detail/detail?id=${id}`

  const onCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(detailPath)
      setMessage('路径已复制')
    } catch {
      setMessage(detailPath)
    }
    setTimeout(() => setMessage(''), 2400)
  }

  return (
    <div style={{
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid var(--theme-elevation-150)',
      background: 'var(--theme-elevation-50)',
      fontSize: '0.84rem',
      color: 'var(--theme-text)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '8px' }}>小程序预览</div>
      <div style={{ opacity: 0.8, marginBottom: '8px', wordBreak: 'break-all' }}>{detailPath}</div>
      <button
        type="button"
        onClick={onCopyPath}
        style={{
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-150)',
          background: 'var(--theme-elevation-100)',
          cursor: 'pointer',
          fontSize: '0.82rem',
        }}
      >
        复制详情页路径
      </button>
      {message && <div style={{ marginTop: '8px', color: 'var(--theme-success-500, #2563eb)' }}>{message}</div>}
    </div>
  )
}

export default ProjectEditHints