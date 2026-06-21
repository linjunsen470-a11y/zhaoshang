'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { LEAD_TYPE_LABELS } from '@/collections/shared/fieldOptions'

interface RelatedLead {
  id: string
  name?: string
  phone?: string
  leadType?: string
  status?: string
}

function getRelationshipIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      if (typeof item === 'string' || typeof item === 'number') return String(item)
      if (item && typeof item === 'object' && 'id' in item) return String((item as { id: string | number }).id)
      return ''
    })
    .filter(Boolean)
}

export const MerchantProfileLeadsPanel: React.FC = () => {
  const { id } = useDocumentInfo()
  const relatedLeadIds = useFormFields(([fields]) => getRelationshipIds(fields.relatedLeads?.value))
  const [leads, setLeads] = useState<RelatedLead[]>([])
  const [loading, setLoading] = useState(false)

  const loadLeads = useCallback(async () => {
    if (!relatedLeadIds.length) {
      setLeads([])
      return
    }
    setLoading(true)
    try {
      const query = relatedLeadIds
        .map((leadId, index) => `where[or][${index}][id][equals]=${encodeURIComponent(leadId)}`)
        .join('&')
      const res = await fetch(`/api/payload/leads?${query}&limit=50&depth=0`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setLeads((data.docs || []).map((item: RelatedLead) => ({
        id: String(item.id),
        name: item.name,
        phone: item.phone,
        leadType: item.leadType,
        status: item.status,
      })))
    } catch (err) {
      console.error(err)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [relatedLeadIds])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadLeads])

  if (!id) {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--theme-text)', opacity: 0.7 }}>
        保存商户档案后可查看关联线索。
      </div>
    )
  }

  return (
    <div style={{
      padding: '14px',
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: '6px',
      background: 'var(--theme-elevation-50)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--theme-text)' }}>关联咨询线索</div>
      {loading ? (
        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>加载中...</div>
      ) : leads.length === 0 ? (
        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
          暂无关联线索。可在线索详情中使用「沉淀为商户档案」建立关联。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leads.map(lead => (
            <a
              key={lead.id}
              href={`/admin/collections/leads/${lead.id}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--theme-elevation-150)',
                background: '#fff',
                color: 'var(--theme-text)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{lead.name || '未命名客户'}</div>
              <div style={{ marginTop: '4px', fontSize: '0.8rem', opacity: 0.75 }}>
                {LEAD_TYPE_LABELS[lead.leadType || ''] || lead.leadType} · {lead.status}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default MerchantProfileLeadsPanel