import { json } from '../../_shared/payloadApi'
import { signAuthToken } from '../../_shared/auth'

type WechatSessionResponse = {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>
  const mode = process.env.WECHAT_AUTH_MODE || 'wechat'

  if (mode === 'dev' && process.env.NODE_ENV !== 'production') {
    const requestedOpenId = request.headers.get('x-dev-openid') || String(input.devOpenId || '')
    const openid = requestedOpenId || process.env.WECHAT_AUTH_DEV_OPENID || 'dev-openid-local'
    const token = signAuthToken(openid)
    return json({ token, openid, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, mode: 'dev' })
  }


  const code = String(input.code || '')
  if (!code) return json({ error: '缺少微信登录 code' }, 400)

  const appid = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_APP_SECRET
  if (!appid || !secret) return json({ error: '服务端未配置微信登录参数' }, 500)

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appid)
  url.searchParams.set('secret', secret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url)
  const session = await response.json() as WechatSessionResponse
  if (!response.ok || !session.openid || session.errcode) {
    return json({ error: session.errmsg || '微信登录失败' }, 401)
  }

  const token = signAuthToken(session.openid)
  return json({ token, openid: session.openid, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, mode: 'wechat' })
}
