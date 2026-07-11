'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Nav order (business first):
 * 运营工作台 → 房源管理 → 咨询收件箱 → 分享素材 → 上架检查 → 系统设置
 */
const links = [
  {
    label: '运营工作台',
    href: '/admin',
    match: (pathname: string) => pathname === '/admin',
  },
  {
    label: '房源管理',
    href: '/admin/collections/projects',
    match: (pathname: string) => pathname.startsWith('/admin/collections/projects'),
  },
  {
    label: '咨询收件箱',
    href: '/admin/workspace/inquiries',
    match: (pathname: string) =>
      pathname.startsWith('/admin/workspace/inquiries')
      || pathname.startsWith('/admin/collections/leads'),
  },
  {
    label: '分享素材',
    href: '/admin/workspace/share',
    match: (pathname: string) => pathname.startsWith('/admin/workspace/share'),
  },
  {
    label: '上架检查',
    href: '/admin/workspace/quality',
    match: (pathname: string) => pathname.startsWith('/admin/workspace/quality'),
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
