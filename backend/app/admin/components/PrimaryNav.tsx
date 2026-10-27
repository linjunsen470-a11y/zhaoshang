'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const projectTools = [
  { label: '上架检查', href: '/admin/workspace/quality' },
  { label: '分享素材', href: '/admin/workspace/share' },
]

const links = [
  {
    label: '腾讯文档同步',
    href: '/admin/workspace/sync',
    match: (pathname: string) => pathname.startsWith('/admin/workspace/sync'),
  },
  {
    label: '运营工作台',
    href: '/admin',
    match: (pathname: string) => pathname === '/admin',
  },
  {
    label: '项目与铺位',
    href: '/admin/collections/projects',
    match: (pathname: string) => pathname.startsWith('/admin/collections/projects')
      || projectTools.some(tool => pathname.startsWith(tool.href)),
  },
  {
    label: '咨询收件箱',
    href: '/admin/workspace/inquiries',
    match: (pathname: string) =>
      pathname.startsWith('/admin/workspace/inquiries')
      || pathname.startsWith('/admin/collections/leads')
      || pathname.startsWith('/admin/workspace/equipment'),
  },
]

export function PrimaryNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = String((user as { role?: string } | null)?.role || '')
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
          <div key={link.href}>
            <Link
              className={`cms-nav__link${active ? ' cms-nav__link--active' : ''}`}
              href={link.href}
              aria-current={active && !projectTools.some(tool => pathname.startsWith(tool.href)) ? 'page' : undefined}
            >
              {link.label}
            </Link>
            {active && link.href === '/admin/collections/projects' ? (
              <div className="cms-nav__tools" aria-label="项目工具">
                {projectTools.map(tool => (
                  <Link key={tool.href} href={tool.href} aria-current={pathname.startsWith(tool.href) ? 'page' : undefined}>
                    {tool.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

export default PrimaryNav
