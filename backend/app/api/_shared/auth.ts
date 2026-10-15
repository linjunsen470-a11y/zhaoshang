import { verifyAuthToken } from './tokens'
export { signAuthToken, verifyAuthToken } from './tokens'
import { headers } from 'next/headers'
import { getPayloadInstance } from './payloadApi'
import { isStaffUser, canManageProjects, canManageLeads } from '../../../collections/shared/access'

export class AuthError extends Error {
  constructor(message = '未登录或登录已过期') {
    super(message)
    this.name = 'AuthError'
  }
}

export function requireAuth(request: Request) {
  const auth = verifyAuthToken(request.headers.get('authorization'))
  if (!auth) {
    throw new AuthError()
  }
  return auth
}

export async function getAdminUser() {
  try {
    const payload = await getPayloadInstance()
    const reqHeaders = await headers()
    const { user } = await payload.auth({
      headers: reqHeaders,
    })
    return user
  } catch {
    return null
  }
}

export async function getAuthenticatedStaff(requiredPermission?: 'leads' | 'projects') {
  const user = await getAdminUser()
  if (!user) return null

  if (requiredPermission === 'leads') {
    if (canManageLeads(user)) return user
  } else if (requiredPermission === 'projects') {
    if (canManageProjects(user)) return user
  } else {
    if (isStaffUser(user)) return user
  }
  return null
}

