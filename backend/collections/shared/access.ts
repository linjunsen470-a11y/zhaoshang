import type { PayloadRequest } from 'payload'

type StaffUser = {
  id?: string | number
  role?: 'admin' | 'editor' | string
}

export function getStaffRole(user: PayloadRequest['user']): string {
  if (!user || typeof user !== 'object') return ''
  return String((user as StaffUser).role || '')
}


export function isAdminUser(user: PayloadRequest['user']): boolean {
  return getStaffRole(user) === 'admin'
}

export function canManageProjects(user: PayloadRequest['user']): boolean {
  return isStaffUser(user)
}

export function canManageLeads(user: PayloadRequest['user']): boolean {
  return isStaffUser(user)
}

export function isStaffUser(user: PayloadRequest['user']): boolean {
  const role = getStaffRole(user)
  return role === 'admin' || role === 'editor'
}
