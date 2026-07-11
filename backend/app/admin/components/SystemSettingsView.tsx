'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'

export function SystemSettingsView() {
  const { user } = useAuth()
  const isAdmin = String((user as { role?: string } | null)?.role || '') === 'admin'
  return (
    <main className="cms-page" id="main-content">
      <header className="cms-page-header"><div><p className="cms-eyebrow">后台维护</p><h1>系统设置</h1><p>管理后台账号和媒体资源。日常房源图片请直接在房源编辑页上传。</p></div></header>
      {isAdmin ? <section className="cms-settings-grid"><Link className="cms-settings-card" href="/admin/collections/users"><h2>后台账号</h2><p>新增管理员或编辑，并维护账号权限。</p><span>打开账号管理</span></Link><Link className="cms-settings-card" href="/admin/collections/media"><h2>媒体库</h2><p>查看后台上传图片和用户咨询附件。</p><span>打开媒体库</span></Link></section> : <div className="cms-alert" role="alert">只有管理员可以访问系统设置。</div>}
    </main>
  )
}

export default SystemSettingsView
