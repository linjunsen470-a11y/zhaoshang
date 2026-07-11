'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Staff IA (lean):
 * - 房源管理: property list / publish
 * - 咨询收件箱: all leads (property / equipment / renovation filters in page)
 * - 系统设置: admin-only accounts & media
 *
 * Equipment public listing is edited on the lead detail form
 * (处理编辑 → 设备公开设置), not a separate nav item.
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
