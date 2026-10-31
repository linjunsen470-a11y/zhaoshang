import { verifyAuthToken } from '../../_shared/tokens'
import { getClientIp, takeRateLimit } from '../../_shared/rateLimit'
import { jsonInputError, readJsonObject } from '../../_shared/requestInput'
import { getWechatPhone, WechatPhoneError } from '../../../../lib/wechatPhone'

export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: Request) {
  const user = verifyAuthToken(request.headers.get('authorization'))
  if (!user) return Response.json({ error: '请先登录微信后重试' }, { status: 401, headers })
  const rate = takeRateLimit(`wechat-phone:${getClientIp(request)}:${user.openid}`, 10, 10 * 60 * 1000)
  if (!rate.allowed) return Response.json({ error: '授权请求过于频繁，请稍后再试' }, { status: 429, headers: { ...headers, 'Retry-After': String(rate.retryAfterSeconds) } })

  let input: Record<string, unknown>
  try { input = await readJsonObject(request, 8 * 1024) } catch (error) { return jsonInputError(error) }
  const code = typeof input.code === 'string' ? input.code.trim() : ''
  if (!code || code.length > 512 || /\s/.test(code)) return Response.json({ error: '手机号授权凭证无效，请重新授权' }, { status: 400, headers })

  try {
    const phone = await getWechatPhone(code)
    return Response.json(phone, { headers })
  } catch (error) {
    return Response.json({ error: error instanceof WechatPhoneError ? error.message : '微信手机号获取失败，请重试' }, { status: error instanceof WechatPhoneError ? error.status : 502, headers })
  }
}
