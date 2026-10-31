type WechatPhoneConfig = {
  appid: string
  secret: string
  fetcher?: typeof fetch
  now?: () => number
}

export class WechatPhoneError extends Error {
  constructor(message: string, public status = 502) {
    super(message)
    this.name = 'WechatPhoneError'
  }
}

type TokenResponse = { access_token?: string; expires_in?: number; errcode?: number }
type PhoneResponse = {
  errcode?: number
  phone_info?: {
    purePhoneNumber?: string
    countryCode?: string
    watermark?: { appid?: string }
  }
}

/** Keep provider credentials and access tokens on the server, separate from login codes. */
export function createWechatPhoneClient({ appid, secret, fetcher = fetch, now = Date.now }: WechatPhoneConfig) {
  let token: { value: string; expiresAt: number } | null = null
  let tokenRequest: Promise<string> | null = null

  async function getAccessToken() {
    if (token && token.expiresAt > now()) return token.value
    if (!tokenRequest) {
      tokenRequest = (async () => {
        const response = await fetcher('https://api.weixin.qq.com/cgi-bin/stable_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grant_type: 'client_credential', appid, secret }),
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        })
        const data = await response.json() as TokenResponse
        if (!response.ok || data.errcode || typeof data.access_token !== 'string' || !data.access_token) {
          throw new WechatPhoneError('微信手机号服务暂不可用，请稍后重试', 503)
        }
        const expiresIn = Number(data.expires_in)
        token = { value: data.access_token, expiresAt: now() + (Number.isFinite(expiresIn) ? Math.max(0, expiresIn - 120) * 1000 : 0) }
        return token.value
      })().finally(() => { tokenRequest = null })
    }
    return tokenRequest
  }

  async function exchange(code: string, retried = false): Promise<{ phone: string; countryCode: string }> {
    const accessToken = await getAccessToken()
    const response = await fetcher('https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' + encodeURIComponent(accessToken), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    const data = await response.json() as PhoneResponse
    // An invalid access token does not consume the user's one-time phone code.
    // Network failures and invalid/used phone codes are never replayed.
    if ([40001, 40014, 42001].includes(Number(data.errcode)) && !retried) {
      if (token?.value === accessToken) token = null
      return exchange(code, true)
    }
    if ([40029, 40163].includes(Number(data.errcode))) throw new WechatPhoneError('手机号授权已失效，请重新授权', 400)
    if (data.errcode || !response.ok) throw new WechatPhoneError('微信手机号获取失败，请稍后重新授权')
    const info = data.phone_info
    if (!info || info.watermark?.appid !== appid) throw new WechatPhoneError('微信手机号校验失败，请重新授权')
    if (String(info.countryCode) !== '86') throw new WechatPhoneError('暂仅支持中国大陆手机号', 422)
    if (typeof info.purePhoneNumber !== 'string' || !/^1[3-9]\d{9}$/.test(info.purePhoneNumber)) {
      throw new WechatPhoneError('微信手机号格式无效，请重新授权')
    }
    return { phone: info.purePhoneNumber, countryCode: '86' }
  }

  return {
    async getPhone(code: string) {
      try { return await exchange(code) } catch (error) {
        if (error instanceof WechatPhoneError) throw error
        throw new WechatPhoneError('微信手机号服务暂不可用，请稍后重试')
      }
    },
  }
}

let cachedClient: ReturnType<typeof createWechatPhoneClient> | null = null
let cachedConfig = ''

export function getWechatPhone(code: string) {
  const appid = process.env.WECHAT_APPID?.trim()
  const secret = process.env.WECHAT_APP_SECRET?.trim()
  if (!appid || !secret) throw new WechatPhoneError('微信手机号授权服务尚未配置', 503)
  const configKey = appid + '\0' + secret
  if (!cachedClient || cachedConfig !== configKey) {
    cachedClient = createWechatPhoneClient({ appid, secret })
    cachedConfig = configKey
  }
  return cachedClient.getPhone(code)
}
