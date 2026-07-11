import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import React from 'react'

/**
 * Payload 3 does not assign templateType: 'default' for multi-segment custom
 * admin views (e.g. /workspace/*), so RootPage renders them without the
 * DefaultTemplate chrome (nav, account menu). Wrap custom workspace pages here.
 */
export function AdminWorkspaceShell({
  children,
  initPageResult,
  params,
  payload,
  searchParams,
  viewActions,
  viewType,
}: AdminViewServerProps & { children: React.ReactNode }) {
  const { locale, permissions, req, visibleEntities } = initPageResult

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload ?? req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      viewActions={viewActions}
      viewType={viewType}
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      {children}
    </DefaultTemplate>
  )
}

export default AdminWorkspaceShell
