'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { label: '房源管理', href: '/admin/collections/projects', match: ['/admin', '/admin/collections/projects'] },
  { label: '咨询收件箱', href: '/admin/collections/leads', match: ['/admin/collections/leads'] },
  { label: '设备供需', href: '/admin/workspace/equipment', match: ['/admin/workspace/equipment'] },
]

export function PrimaryNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = String((user as { role?: string } | null)?.role || 'editor')
  const visibleLinks = role === 'admin'
    ? [...links, { label: '系统设置', href: '/admin/workspace/system', match: ['/admin/workspace/system', '/admin/collections/users', '/admin/collections/media'] }]
    : links

  return (
    <nav className="cms-nav" aria-label="后台主导航">
      <p className="cms-nav__title">管理中心</p>
      {visibleLinks.map(link => {
        const active = link.match.some(prefix => prefix === '/admin' ? pathname === '/admin' : pathname.startsWith(prefix))
        return (
          <Link className={`cms-nav__link${active ? ' cms-nav__link--active' : ''}`} href={link.href} key={link.href} aria-current={active ? 'page' : undefined}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default PrimaryNav
