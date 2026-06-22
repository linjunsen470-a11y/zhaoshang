import { createHmac, timingSafeEqual } from 'crypto'
import { headers } from 'next/headers'
import { getPayloadInstance } from './payloadApi'
import { isStaffUser, canManageProjects, canManageLeads } from '../../../collections/shared/access'

export type AuthContext = {
  openid: string
  expiresAt: number
}

export class AuthError extends Error {
  constructor(message = '未登录或登录已过期') {
    super(message)
    this.name = 'AuthError'
  }
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function secret() {
  const s = process.env.PAYLOAD_SECRET
  if (!s && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL ERROR: PAYLOAD_SECRET environment variable is missing!')
  }
  return s || 'local-dev-secret'
}


export function signAuthToken(openid: string, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const payload = {
    openid,
    exp: Date.now() + ttlMs,
  }
  const encodedPayload = base64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', secret()).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

export function verifyAuthToken(token: string | null | undefined): AuthContext | null {
  if (!token) return null

  const [encodedPayload, signature] = token.replace(/^Bearer\s+/i, '').split('.')
  if (!encodedPayload || !signature) return null

  const expected = createHmac('sha256', secret()).update(encodedPayload).digest('base64url')
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      openid?: unknown
      exp?: unknown
    }
    if (typeof payload.openid !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null

    return {
      openid: payload.openid,
      expiresAt: payload.exp,
    }
  } catch {
    return null
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

