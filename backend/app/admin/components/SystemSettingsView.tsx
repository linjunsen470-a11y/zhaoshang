'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'

export function SystemSettingsView() {
  const { user } = useAuth()
  const isAdmin = String((user as { role?: string } | null)?.role || '') === 'admin'
  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header"><div><p className="cms-eyebrow">后台维护</p><h1>系统设置</h1><p>管理账号、图片和文档连接。</p></div></header>
      {isAdmin ? <section className="cms-settings-grid"><Link className="cms-settings-card" href="/admin/collections/users"><h2>用户管理</h2><p>添加员工账号，设置管理员或普通用户。</p><span>管理用户</span></Link><Link className="cms-settings-card" href="/admin/collections/media"><h2>媒体库</h2><p>查看后台上传图片和用户咨询附件。</p><span>打开媒体库</span></Link><Link className="cms-settings-card" href="/admin/workspace/sync"><h2>腾讯文档</h2><p>查看同步结果，维护连接设置。</p><span>查看文档同步</span></Link></section> : <div className="cms-alert" role="alert">只有管理员可以访问系统设置。</div>}
    </main>
  )
}

export default SystemSettingsView
