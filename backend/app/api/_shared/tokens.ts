import { createHmac, timingSafeEqual } from 'crypto'

function secret() {
  const value = process.env.MINIPROGRAM_TOKEN_SECRET
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('MINIPROGRAM_TOKEN_SECRET is required in production')
  }
  return value || process.env.PAYLOAD_SECRET || 'local-dev-secret'
}

function sign(value: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`
}

function verify(token: string): Record<string, unknown> | null {
  if (token.length > 4096) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts.every(value => /^[A-Za-z0-9_-]+$/.test(value))) return null
  const [body, signature] = parts
  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  const supplied = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const data = value as Record<string, unknown>
    if (typeof data.exp !== 'number' || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null
    return data
  } catch { return null }
}

export function signAuthToken(openid: string, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  return sign({ openid, exp: Date.now() + ttlMs })
}

export function verifyAuthToken(token: string | null | undefined) {
  if (!token) return null
  const data = verify(token.replace(/^Bearer\s+/i, ''))
  if (!data || data.purpose || typeof data.openid !== 'string' || !data.openid.trim()) return null
  return { openid: data.openid, expiresAt: data.exp as number }
}

/** Short-lived capability for image components that cannot send auth headers. */
export function signMediaToken(mediaId: string, ownerOpenId: string, ttlMs = 60 * 60 * 1000) {
  return sign({ purpose: 'lead-image', mediaId, ownerOpenId, exp: Date.now() + ttlMs })
}

export function verifyMediaToken(token: string | null, mediaId: string) {
  const data = token ? verify(token) : null
  if (!data || data.purpose !== 'lead-image' || data.mediaId !== mediaId || typeof data.ownerOpenId !== 'string' || !data.ownerOpenId) return null
  return data.ownerOpenId
}
