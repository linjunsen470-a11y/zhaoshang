'use client'

import React, { useCallback, useEffect, useState } from 'react'

interface DashboardStats {
  newLeads: number
  dueFollowUps: number
  pendingAudit: number
  onlineProjects: number
}

interface QuickLink {
  title: string
  desc: string
  href: string
  count?: number
  tone: 'blue' | 'amber' | 'green' | 'slate'
}

const toneStyles: Record<QuickLink['tone'], { bg: string; border: string; count: string }> = {
  blue: { bg: '#eff6ff', border: '#bfdbfe', count: '#1d4ed8' },
  amber: { bg: '#fffbeb', border: '#fde68a', count: '#b45309' },
  green: { bg: '#ecfdf5', border: '#a7f3d0', count: '#047857' },
  slate: { bg: '#f8fafc', border: '#e2e8f0', count: '#334155' },
}

async function fetchTotal(url: string): Promise<number> {
  const res = await fetch(url)
  if (!res.ok) return 0
  const data = await res.json()
  return typeof data.totalDocs === 'number' ? data.totalDocs : 0
}

export const OperationsDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    newLeads: 0,
    dueFollowUps: 0,
    pendingAudit: 0,
    onlineProjects: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const [newLeads, dueFollowUps, pendingAudit, onlineProjects] = await Promise.all([
        fetchTotal('/api/payload/leads?where[status][equals]=new&limit=0'),
        fetchTotal(`/api/payload/leads?where[and][0][nextFollowAt][less_than_equal]=${encodeURIComponent(now)}&where[and][1][status][not_in]=closed,invalid,paused&limit=0`),
        fetchTotal('/api/payload/projects?where[auditStatus][equals]=pending&limit=0'),
        fetchTotal('/api/payload/projects?where[status][equals]=online&limit=0'),
      ])
      setStats({ newLeads, dueFollowUps, pendingAudit, onlineProjects })
    } catch (err) {
      console.error('Failed to load dashboard stats', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStats()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadStats])

  const links: QuickLink[] = [
    {
      title: '新线索待处理',
      desc: '状态为「新线索」的咨询',
      href: '/admin/collections/leads?where[status][equals]=new&sort=-createdAt',
      count: stats.newLeads,
      tone: 'blue',
    },
    {
      title: '到期待跟进',
      desc: '下次跟进时间已到或已过',
      href: '/admin/collections/leads?sort=nextFollowAt',
      count: stats.dueFollowUps,
      tone: 'amber',
    },
    {
      title: '待审核项目',
      desc: '审核状态为「待审核」',
      href: '/admin/collections/projects?where[auditStatus][equals]=pending&sort=-updatedAt',
      count: stats.pendingAudit,
      tone: 'amber',
    },
    {
      title: '已上线项目',
      desc: '发布状态为「开放中」',
      href: '/admin/collections/projects?where[status][equals]=online&sort=-sort',
      count: stats.onlineProjects,
      tone: 'green',
    },
  ]

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--theme-text)' }}>今日工作台</h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--theme-text)', opacity: 0.7 }}>
            优先处理新线索、到期跟进与待审核项目。
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-text)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {loading ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        {links.map(link => {
          const tone = toneStyles[link.tone]
          return (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '18px',
                borderRadius: '8px',
                border: `1px solid ${tone.border}`,
                backgroundColor: tone.bg,
                color: 'var(--theme-text)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{link.title}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: tone.count, lineHeight: 1 }}>
                  {loading ? '—' : link.count}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.82rem', opacity: 0.75 }}>{link.desc}</div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default OperationsDashboard