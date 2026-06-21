import { createHmac, timingSafeEqual } from 'crypto'

export type AuthContext = {
  openid: string
  expiresAt: number
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function secret() {
  return process.env.PAYLOAD_SECRET || 'local-dev-secret'
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
    throw new Response(JSON.stringify({ error: '未登录或登录已过期' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }
  return auth
}
