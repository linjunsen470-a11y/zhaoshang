'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useDocumentInfo, useAuth } from '@payloadcms/ui'

interface FollowRecord {
  id: string
  content: string
  operatorName?: string
  nextFollowAt?: string
  createdAt: string
}

export const LeadFollowTimeline: React.FC = () => {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  
  const [followUps, setFollowUps] = useState<FollowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form fields
  const [content, setContent] = useState('')
  const [nextFollowAt, setNextFollowAt] = useState('')
  const [operatorName, setOperatorName] = useState('')
  
  // Set default operator name from user email
  useEffect(() => {
    if (user && user.email) {
      const defaultOp = user.email.split('@')[0]
      const timer = setTimeout(() => {
        setOperatorName(prev => prev || defaultOp)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [user])

  // Fetch follow-ups
  const fetchFollowUps = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payload/follow-records?where[lead][equals]=${id}&sort=-createdAt&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setFollowUps(data.docs || [])
      } else {
        setError('获取跟进记录失败')
      }
    } catch (err) {
      console.error(err)
      setError('网络错误，无法加载跟进记录')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      const timer = setTimeout(() => {
        fetchFollowUps()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [id, fetchFollowUps])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!content.trim()) {
      alert('请填写跟进内容')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const res = await fetch('/api/payload/follow-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: id,
          content: content.trim(),
          nextFollowAt: nextFollowAt ? new Date(nextFollowAt).toISOString() : undefined,
          operatorName: operatorName.trim() || '系统管理员',
        }),
      })

      if (res.ok) {
        setContent('')
        setNextFollowAt('')
        // Refresh list
        await fetchFollowUps()
      } else {
        const data = await res.json()
        setError(data.errors?.[0]?.message || '提交跟进记录失败')
      }
    } catch (err) {
      console.error(err)
      setError('提交失败，请检查网络')
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) {
    return (
      <div style={{
        padding: '20px',
        border: '1px dashed var(--theme-elevation-150)',
        borderRadius: '4px',
        color: 'var(--theme-text)',
        opacity: 0.7,
        textAlign: 'center',
        margin: '20px 0'
      }}>
        提示：请先保存当前线索（商机）信息，保存后再录入跟进记录。
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', margin: '20px 0' }}>
      
      {/* Follow-up Creation Card */}
      <div style={{
        padding: '24px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '6px',
        backgroundColor: 'var(--theme-elevation-50)',
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--theme-text)' }}>
          新建跟进记录
        </h4>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--theme-text)', opacity: 0.8 }}>跟进内容 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入本次与客户沟通的详细情况..."
              required
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--theme-elevation-150)',
                backgroundColor: 'var(--theme-elevation-100)',
                color: 'var(--theme-text)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--theme-text)', opacity: 0.8 }}>下次跟进时间</label>
              <input
                type="datetime-local"
                value={nextFollowAt}
                onChange={(e) => setNextFollowAt(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--theme-elevation-150)',
                  backgroundColor: 'var(--theme-elevation-100)',
                  color: 'var(--theme-text)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--theme-text)', opacity: 0.8 }}>跟进人</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="跟进人姓名/邮箱"
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--theme-elevation-150)',
                  backgroundColor: 'var(--theme-elevation-100)',
                  color: 'var(--theme-text)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--theme-error-500)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              style={{
                padding: '10px 24px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: submitting || !content.trim() ? 'var(--theme-elevation-200)' : 'var(--theme-success-500, #2563eb)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              {submitting ? '保存中...' : '提交跟进记录'}
            </button>
          </div>
        </form>
      </div>

      {/* Follow-up Timeline List */}
      <div>
        <h4 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--theme-text)' }}>
          历史跟进明细
        </h4>
        
        {loading ? (
          <div style={{ color: 'var(--theme-text)', opacity: 0.7 }}>加载中...</div>
        ) : followUps.length === 0 ? (
          <div style={{
            padding: '30px',
            border: '1px dashed var(--theme-elevation-150)',
            borderRadius: '4px',
            color: 'var(--theme-text)',
            opacity: 0.6,
            textAlign: 'center'
          }}>
            暂无跟进记录，请在上方录入第一条跟进！
          </div>
        ) : (
          <div style={{
            position: 'relative',
            paddingLeft: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Timeline vertical bar */}
            <div style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--theme-elevation-200)'
            }} />

            {followUps.map((item) => {
              const createdDate = new Date(item.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })

              const nextDate = item.nextFollowAt ? new Date(item.nextFollowAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : null

              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '6px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--theme-success-500, #2563eb)',
                    border: '2px solid var(--theme-bg, #fff)'
                  }} />

                  <div style={{
                    padding: '16px',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--theme-elevation-50)'
                  }}>
                    {/* Header info */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px',
                      fontSize: '0.85rem',
                      color: 'var(--theme-text)',
                      opacity: 0.7
                    }}>
                      <div>
                        跟进时间：<span style={{ fontWeight: 'bold' }}>{createdDate}</span>
                      </div>
                      <div>
                        跟进人：<span style={{ fontWeight: 'bold' }}>{item.operatorName || '系统管理员'}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{
                      fontSize: '0.95rem',
                      lineHeight: '1.5',
                      color: 'var(--theme-text)',
                      whiteSpace: 'pre-wrap',
                      marginBottom: nextDate ? '10px' : '0'
                    }}>
                      {item.content}
                    </div>

                    {/* Next Follow Time */}
                    {nextDate && (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--theme-elevation-100)',
                        borderRadius: '3px',
                        color: 'var(--theme-text)',
                        display: 'inline-block'
                      }}>
                        📅 下次跟进：<span style={{ fontWeight: 'bold' }}>{nextDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

export default LeadFollowTimeline

