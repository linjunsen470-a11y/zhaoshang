'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Config = { connected: boolean; endpointHost: string; hasToken: boolean; transport: string; fileId: string; propertySheetId: string; leadSheetId: string; sourceKey: string; enabled: boolean; importProperties: boolean; exportLeads: boolean; intervalMinutes: number }
type Report = { startedAt: string; finishedAt?: string; trigger: string; properties: { created: number; updated: number; unchanged: number }; leads: { created: number; updated: number; withdrawn: number; followups: number; unchanged: number }; errors: { area: string; recordId?: string; message: string }[] }
type Data = { config: Config; lastRun: Report | null; workerRunning: boolean; counts: { properties: number; leads: number } }

async function readResponse(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败')
  return data
}

export default function TencentSyncView() {
  const { user } = useAuth()
  const isAdmin = String((user as { role?: string } | null)?.role || '') === 'admin'
  const [data, setData] = useState<Data | null>(null)
  const [settings, setSettings] = useState<Config | null>(null)
  const [endpoint, setEndpoint] = useState('')
  const [token, setToken] = useState('')
  const [clearToken, setClearToken] = useState(false)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    const next: Data = await readResponse(await fetch('/api/admin/tencent-sync', { signal, cache: 'no-store' }))
    setData(next)
    setSettings(next.config)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      load(controller.signal).catch(error => { if (error.name !== 'AbortError') setError(error.message) })
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])

  async function act(action: 'save' | 'test' | 'sync') {
    setBusy(action); setError(''); setMessage('')
    try {
      const response = await readResponse(await fetch('/api/admin/tencent-sync', {
        method: action === 'save' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'save' ? { ...settings, endpoint, token, clearToken } : { action }),
      }))
      if (action === 'save') { setEndpoint(''); setToken(''); setClearToken(false) }
      setMessage(response.message || (action === 'save' ? '配置已保存' : response.report.errors.length ? '本次同步有失败项，请查看下方结果' : '同步完成'))
      await load()
    } catch (error) { setError(error instanceof Error ? error.message : '操作失败') }
    finally { setBusy('') }
  }
  const edit = <K extends keyof Config>(key: K, value: Config[K]) => setSettings(current => current ? { ...current, [key]: value } : current)
  const report = data?.lastRun
  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header"><div><p className="cms-eyebrow">Demo 业务协作</p><h1>腾讯文档同步</h1><p>表格房源直接同步到后台；客户咨询定期回写，表格中的处理状态和备注可同步回来。</p></div><button className="cms-button cms-button--primary" disabled={Boolean(busy) || !data?.config.connected} onClick={() => void act('sync')}>{busy === 'sync' ? '正在同步…' : '立即同步'}</button></header>
      {error ? <div className="cms-alert" role="alert">{error}</div> : null}
      {message ? <p role="status">{message}</p> : null}
      {!data || !settings ? <p>正在读取同步配置…</p> : <>
        <section className="cms-panel cms-sync-summary" aria-label="连接与运行状态">
          <p><strong>连接：</strong>{data.config.connected ? `已配置 ${data.config.endpointHost}` : '待填写 MCP 服务地址'}</p>
          <p><strong>定时任务：</strong>{data.workerRunning ? settings.enabled ? `运行中，每 ${settings.intervalMinutes} 分钟同步` : '进程运行中，定时同步未启用' : '未运行。使用 pnpm demo:connected 同时启动后台与同步任务。'}</p>
          <p><strong>当前后台：</strong>腾讯文档导入房源 {data.counts.properties} 条 · 客户咨询 {data.counts.leads} 条</p>
          <div className="cms-row-actions"><Link href="/admin/collections/projects">查看房源</Link><Link href="/admin/workspace/inquiries">查看咨询</Link>{settings.fileId === 'NFVwfGTkzTfI' ? <a href="https://docs.qq.com/smartsheet/DTkZWd2ZHVGt6VGZJ" target="_blank" rel="noreferrer">打开腾讯文档</a> : null}</div>
        </section>
        <section className="cms-panel cms-sync-config" aria-labelledby="connection-heading"><h2 id="connection-heading">连接配置</h2>
          <p className="cms-help">使用你已有的 MCP 接入地址。地址或 Token 可能含凭证，保存后不会回显；留空保留原配置。</p>
          <fieldset className="cms-form" disabled={!isAdmin || Boolean(busy)}>
            <div className="cms-form-grid">
              <label>MCP 服务地址<input type="password" autoComplete="off" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder={settings.connected ? '已保存，输入新地址可替换' : 'https://…/mcp 或 …/sse'} /></label>
              <label>Bearer Token（按服务要求选填）<input type="password" autoComplete="new-password" value={token} onChange={event => setToken(event.target.value)} placeholder={settings.hasToken ? '已保存，留空保留' : '地址已含凭证时通常留空'} /></label>
              <label>传输方式<select value={settings.transport} onChange={event => edit('transport', event.target.value)}><option value="http">Streamable HTTP</option><option value="sse">SSE</option></select></label>
              <label>文档 ID<input value={settings.fileId} onChange={event => edit('fileId', event.target.value)} /></label>
              <label>房源工作表 ID<input value={settings.propertySheetId} onChange={event => edit('propertySheetId', event.target.value)} /></label>
              <label>客户咨询工作表 ID<input value={settings.leadSheetId} onChange={event => edit('leadSheetId', event.target.value)} /></label>
              <label>同步来源标识<input value={settings.sourceKey} onChange={event => edit('sourceKey', event.target.value)} /></label>
              <label>同步周期（分钟）<input type="number" min="1" max="1440" value={settings.intervalMinutes} onChange={event => edit('intervalMinutes', Number(event.target.value))} /></label>
            </div>
            <div className="cms-sync-toggles">
              <label className="cms-checkbox"><input type="checkbox" checked={settings.importProperties} onChange={event => edit('importProperties', event.target.checked)} /> 导入腾讯文档房源</label>
              <label className="cms-checkbox"><input type="checkbox" checked={settings.exportLeads} onChange={event => edit('exportLeads', event.target.checked)} /> 回写客户资料并读取跟进状态</label>
              <label className="cms-checkbox"><input type="checkbox" checked={settings.enabled} onChange={event => edit('enabled', event.target.checked)} /> 启用定时同步</label>
              {settings.hasToken ? <label className="cms-checkbox"><input type="checkbox" checked={clearToken} onChange={event => setClearToken(event.target.checked)} /> 清除已保存的 Bearer Token</label> : null}
            </div>
            <button className="cms-button cms-button--primary" onClick={() => void act('save')}>{busy === 'save' ? '保存中…' : '保存配置'}</button>
          </fieldset>
          {!isAdmin ? <p className="cms-help">连接配置由管理员维护。</p> : null}
          <button className="cms-button" disabled={Boolean(busy) || !data.config.connected} onClick={() => void act('test')}>{busy === 'test' ? '检测中…' : '检测已保存的连接'}</button>
        </section>
        <section className="cms-panel cms-sync-report" aria-labelledby="report-heading"><h2 id="report-heading">最近一次处理结果</h2>
          {report ? <><p className="cms-help">{new Date(report.startedAt).toLocaleString('zh-CN')} · {report.trigger === 'scheduled' ? '定时同步' : report.trigger === 'assistant-demo-import' ? '聊天连接导入演示' : report.trigger === 'assistant-demo-followup' ? '聊天连接跟进回读演示' : '手动同步'}</p><p>房源：新增 {report.properties.created} · 更新 {report.properties.updated} · 无变化 {report.properties.unchanged}</p><p>客户：新增 {report.leads.created} · 更新 {report.leads.updated} · 跟进回读 {report.leads.followups} · 标记撤回 {report.leads.withdrawn}</p>{report.errors.length ? <ul>{report.errors.map((item, index) => <li key={`${item.area}-${item.recordId}-${index}`}>{item.area} {item.recordId}：{item.message}</li>)}</ul> : <p>本次处理没有失败项。</p>}</> : <p>尚未执行同步。配置并检测连接后，点击“立即同步”。</p>}
        </section>
        <p className="cms-help">客户同步范围：称呼、电话、需求、关联房源、提交时间及处理状态。不包含 OpenID、登录凭证和用户附件。目标文档必须为私密或部分成员可见；客户删除咨询后，文档只标记撤回，资料清理由管理员处理。</p>
      </>}
    </main>
  )
}
