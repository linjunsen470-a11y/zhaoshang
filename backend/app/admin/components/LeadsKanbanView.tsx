'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { LEAD_KANBAN_COLUMNS, LEAD_TYPE_LABELS } from '@/collections/shared/fieldOptions'

interface LeadCard {
  id: string
  name?: string
  phone?: string
  leadType?: string
  status?: string
  projectTitle?: string
  nextFollowAt?: string
}

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const LeadsKanbanView: React.FC = () => {
  const [leads, setLeads] = useState<LeadCard[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState('')
  const [message, setMessage] = useState('')

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payload/leads?limit=300&depth=0&sort=-updatedAt')
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setLeads((data.docs || []).map((item: LeadCard) => ({
        id: String(item.id),
        name: item.name,
        phone: item.phone,
        leadType: item.leadType,
        status: item.status,
        projectTitle: item.projectTitle,
        nextFollowAt: item.nextFollowAt,
      })))
    } catch (err) {
      console.error(err)
      setMessage('加载线索失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadLeads])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(LEAD_KANBAN_COLUMNS.map(column => [column.value, [] as LeadCard[]])) as Record<string, LeadCard[]>
    leads.forEach(lead => {
      const status = lead.status || 'new'
      if (map[status]) map[status].push(lead)
    })
    return map
  }, [leads])

  const onDropToColumn = async (status: string) => {
    if (!draggingId) return
    const lead = leads.find(item => item.id === draggingId)
    if (!lead || lead.status === status) {
      setDraggingId('')
      return
    }

    try {
      const res = await fetch(`/api/payload/leads/${draggingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('update failed')
      setLeads(prev => prev.map(item => item.id === draggingId ? { ...item, status } : item))
      setMessage(`已更新为「${LEAD_KANBAN_COLUMNS.find(col => col.value === status)?.label || status}」`)
      setTimeout(() => setMessage(''), 1800)
    } catch (err) {
      console.error(err)
      setMessage('状态更新失败')
    } finally {
      setDraggingId('')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '18px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--theme-text)' }}>线索看板</h1>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--theme-text)', opacity: 0.7 }}>
            拖拽卡片可快速更新跟进状态；点击卡片进入详情编辑。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { window.location.href = '/admin/collections/leads' }}
            style={{
              padding: '8px 14px',
              borderRadius: '4px',
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-elevation-50)',
              color: 'var(--theme-text)',
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            返回列表视图
          </button>
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '4px',
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-elevation-50)',
              color: 'var(--theme-text)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '刷新中...' : '刷新看板'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: '14px', fontSize: '0.88rem', color: 'var(--theme-success-500, #2563eb)' }}>
          {message}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '14px',
        overflowX: 'auto',
        paddingBottom: '8px',
        minHeight: '420px',
      }}>
        {LEAD_KANBAN_COLUMNS.map(column => (
          <div
            key={column.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropToColumn(column.value)}
            style={{
              flex: '0 0 260px',
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <div style={{ fontWeight: 700, color: column.tone, fontSize: '0.92rem' }}>{column.label}</div>
              <div style={{
                minWidth: '24px',
                height: '24px',
                borderRadius: '999px',
                background: 'var(--theme-elevation-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                color: 'var(--theme-text)',
              }}>
                {grouped[column.value]?.length || 0}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(grouped[column.value] || []).map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => setDraggingId('')}
                  onClick={() => {
                    window.location.href = `/admin/collections/leads/${lead.id}`
                  }}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'grab',
                    boxShadow: draggingId === lead.id ? '0 6px 16px rgba(15,23,42,0.12)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--theme-text)' }}>
                    {lead.name || '未命名客户'}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--theme-text)', opacity: 0.75 }}>
                    {lead.phone || '无电话'}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--theme-text)', opacity: 0.8 }}>
                    {LEAD_TYPE_LABELS[lead.leadType || ''] || lead.leadType || '咨询'}
                  </div>
                  {lead.projectTitle && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#2563eb' }}>
                      {lead.projectTitle}
                    </div>
                  )}
                  {lead.nextFollowAt && (
                    <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#b45309' }}>
                      下次跟进：{formatDate(lead.nextFollowAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeadsKanbanView