import type { PayloadRequest } from 'payload'

type StaffUser = {
  id?: string | number
  role?: 'admin' | 'advisor' | 'editor' | string
}

function getRole(user: PayloadRequest['user']): string {
  if (!user || typeof user !== 'object') return ''
  return String((user as StaffUser).role || 'admin')
}

export function isAdminUser(user: PayloadRequest['user']): boolean {
  return getRole(user) === 'admin'
}

export function canManageProjects(user: PayloadRequest['user']): boolean {
  const role = getRole(user)
  return role === 'admin' || role === 'editor' || role === 'advisor'
}

export function canManageLeads(user: PayloadRequest['user']): boolean {
  const role = getRole(user)
  return role === 'admin' || role === 'advisor'
}

export function canManageMerchants(user: PayloadRequest['user']): boolean {
  return canManageLeads(user)
}

export function isStaffUser(user: PayloadRequest['user']): boolean {
  return canManageProjects(user) || canManageLeads(user)
}