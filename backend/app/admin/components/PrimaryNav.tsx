'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Single IA for staff:
 * - 房源管理: publish properties
 * - 咨询收件箱: all customer leads (filter by business line in page)
 * - 设备上架: public listing flags for equipment leads only
 * - 系统设置: admin accounts / media
 */
const links = [
  {
    label: '房源管理',
    href: '/admin',
    match: (pathname: string) =>
      pathname === '/admin' || pathname.startsWith('/admin/collections/projects'),
  },
  {
    label: '咨询收件箱',
    href: '/admin/workspace/inquiries',
    match: (pathname: string) =>
      pathname.startsWith('/admin/workspace/inquiries')
      || pathname.startsWith('/admin/collections/leads'),
  },
  {
    label: '设备上架',
    href: '/admin/workspace/equipment',
    match: (pathname: string) => pathname.startsWith('/admin/workspace/equipment'),
  },
]

export function PrimaryNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = String((user as { role?: string } | null)?.role || 'editor')
  const visibleLinks = role === 'admin'
    ? [
        ...links,
        {
          label: '系统设置',
          href: '/admin/workspace/system',
          match: (path: string) =>
            path.startsWith('/admin/workspace/system')
            || path.startsWith('/admin/collections/users')
            || path.startsWith('/admin/collections/media'),
        },
      ]
    : links

  return (
    <nav className="cms-nav" aria-label="后台主导航">
      <p className="cms-nav__title">管理中心</p>
      {visibleLinks.map(link => {
        const active = link.match(pathname)
        return (
          <Link
            className={`cms-nav__link${active ? ' cms-nav__link--active' : ''}`}
            href={link.href}
            key={link.href}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default PrimaryNav
