import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, isPublicProject, json } from '../../_shared/payloadApi'
import { getClientIp, takeRateLimit } from '../../_shared/rateLimit'

type TokenCache = { value: string; expiresAt: number }
type CodeCache = { value: ArrayBuffer; expiresAt: number }

let tokenCache: TokenCache | null = null
const codeCache = new Map<string, CodeCache>()

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value

  const appid = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_APP_SECRET
  if (!appid || !secret) throw new Error('服务端未配置微信 AppID/AppSecret')

  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', appid)
  url.searchParams.set('secret', secret)
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json() as { access_token?: string; expires_in?: number; errmsg?: string }
  if (!response.ok || !data.access_token) throw new Error(data.errmsg || '获取微信 access_token 失败')

  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(300, Number(data.expires_in || 7200) - 120) * 1000,
  }
  return tokenCache.value
}

async function createMiniProgramCode(projectId: string) {
  const cached = codeCache.get(projectId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const token = await getAccessToken()
  const response = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scene: projectId.slice(0, 32),
      page: 'pages/detail/detail',
      check_path: false,
      env_version: process.env.WECHAT_CODE_ENV_VERSION || 'release',
      width: 280,
    }),
    cache: 'no-store',
  })
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || contentType.includes('application/json')) {
    const error = await response.json().catch(() => ({})) as { errmsg?: string }
    throw new Error(error.errmsg || '生成微信小程序码失败')
  }

  const value = await response.arrayBuffer()
  codeCache.set(projectId, { value, expiresAt: Date.now() + 6 * 60 * 60 * 1000 })
  return value
}

export async function GET(request: Request) {
  const staff = await getAuthenticatedStaff('projects')
  if (!staff) return json({ error: '请先登录后台' }, 401)

  const rate = takeRateLimit(`wechat-code:${getClientIp(request)}:${String(staff.id)}`, 60, 60 * 60 * 1000)
  if (!rate.allowed) {
    return Response.json(
      { error: '小程序码生成过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() || ''
  if (!projectId || projectId.length > 32) return json({ error: '房源 ID 无效' }, 400)

  try {
    const payload = await getPayloadInstance()
    const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 1, overrideAccess: true })
    if (!isPublicProject(project as unknown as Record<string, unknown>)) {
      return json({ error: '房源尚未公开，不能生成对外分享码' }, 409)
    }
    const code = await createMiniProgramCode(String(project.id))
    return new Response(code, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '小程序码生成失败' }, 502)
  }
}
