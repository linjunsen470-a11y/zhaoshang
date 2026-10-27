import assert from 'node:assert/strict'
import test from 'node:test'
import { createWechatPhoneClient } from '../lib/wechatPhone'
import { POST } from '../app/api/auth/wechat-phone/route'
import { signAuthToken } from '../app/api/_shared/tokens'

const phoneInfo = (appid = 'unit-app') => ({ errcode: 0, phone_info: { purePhoneNumber: '13812345678', countryCode: '86', watermark: { appid } } })
const response = (data: unknown) => Response.json(data)

test('phone exchange caches access tokens, refreshes before expiry and posts only the authorization code', async () => {
  let now = 0
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const client = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', now: () => now, fetcher: async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    return String(url).includes('stable_token') ? response({ access_token: 'token-1', expires_in: 7200 }) : response(phoneInfo())
  } })
  assert.deepEqual(await client.getPhone('phone-code'), { phone: '13812345678', countryCode: '86' })
  await client.getPhone('another-code')
  assert.equal(calls.filter(call => call.url.includes('stable_token')).length, 1)
  assert.deepEqual(calls[1].body, { code: 'phone-code' })
  assert.equal(calls[0].url.includes('unit-secret'), false)
  now = 7_100_000
  await client.getPhone('third-code')
  assert.equal(calls.filter(call => call.url.includes('stable_token')).length, 2)
})

test('concurrent phone authorizations share one access token request', async () => {
  let tokenCalls = 0
  const client = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', fetcher: async url => {
    if (String(url).includes('stable_token')) { tokenCalls++; await new Promise(resolve => setTimeout(resolve, 10)); return response({ access_token: 'token', expires_in: 7200 }) }
    return response(phoneInfo())
  } })
  await Promise.all([client.getPhone('one'), client.getPhone('two')])
  assert.equal(tokenCalls, 1)
})

test('only an explicit invalid-access-token response permits one retry', async () => {
  let tokenCalls = 0
  let phoneCalls = 0
  const client = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', fetcher: async url => {
    if (String(url).includes('stable_token')) return response({ access_token: 'token-' + ++tokenCalls, expires_in: 7200 })
    return ++phoneCalls === 1 ? response({ errcode: 42001 }) : response(phoneInfo())
  } })
  assert.equal((await client.getPhone('once')).phone, '13812345678')
  assert.equal(tokenCalls, 2)
  assert.equal(phoneCalls, 2)

  phoneCalls = 0
  const expired = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', fetcher: async url => {
    if (String(url).includes('stable_token')) return response({ access_token: 'token', expires_in: 7200 })
    phoneCalls++; return response({ errcode: 40163, errmsg: 'provider details must not leak' })
  } })
  await assert.rejects(expired.getPhone('used-code'), /授权已失效/)
  assert.equal(phoneCalls, 1)
})

test('mismatched app IDs, foreign numbers and transient failures never authorize a phone', async () => {
  for (const info of [phoneInfo('other-app'), { ...phoneInfo(), phone_info: { ...phoneInfo().phone_info, countryCode: '1' } }, { ...phoneInfo(), phone_info: { ...phoneInfo().phone_info, purePhoneNumber: 'not-a-number' } }]) {
    const client = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', fetcher: async url => String(url).includes('stable_token') ? response({ access_token: 'token', expires_in: 7200 }) : response(info) })
    await assert.rejects(client.getPhone('code'))
  }
  let attempts = 0
  const offline = createWechatPhoneClient({ appid: 'unit-app', secret: 'unit-secret', fetcher: async () => { attempts++; throw new Error('secret provider diagnostic') } })
  await assert.rejects(offline.getPhone('code'), error => error instanceof Error && !error.message.includes('secret') && error.message.includes('暂不可用'))
  assert.equal(attempts, 1)
})

test('phone route rejects anonymous and malformed requests without contacting WeChat', async () => {
  assert.equal((await POST(new Request('http://localhost/api/auth/wechat-phone', { method: 'POST' }))).status, 401)
  const headers = { Authorization: 'Bearer ' + signAuthToken('phone-validation'), 'Content-Type': 'application/json' }
  for (const body of ['[]', '{}', '{"code":12}', '{"code":"bad code"}']) {
    const result = await POST(new Request('http://localhost/api/auth/wechat-phone', { method: 'POST', headers, body }))
    assert.equal(result.status, 400)
  }
  assert.equal((await POST(new Request('http://localhost/api/auth/wechat-phone', { method: 'POST', headers, body: JSON.stringify({ code: 'x'.repeat(9000) }) }))).status, 413)
})

test('phone route returns provider-verified data with no caching and never trusts client-supplied numbers', async () => {
  const originalFetch = globalThis.fetch
  const originalApp = process.env.WECHAT_APPID
  const originalSecret = process.env.WECHAT_APP_SECRET
  process.env.WECHAT_APPID = 'route-unit-app'
  process.env.WECHAT_APP_SECRET = 'route-unit-secret'
  globalThis.fetch = async url => String(url).includes('stable_token') ? response({ access_token: 'secret-access-token', expires_in: 7200 }) : response(phoneInfo('route-unit-app'))
  try {
    const result = await POST(new Request('http://localhost/api/auth/wechat-phone', { method: 'POST', headers: { Authorization: 'Bearer ' + signAuthToken('phone-success') }, body: JSON.stringify({ code: 'phone-code', phone: '13999999999', openid: 'other' }) }))
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store')
    assert.deepEqual(await result.json(), { phone: '13812345678', countryCode: '86' })
    const headers = { Authorization: 'Bearer ' + signAuthToken('phone-limit') }
    let resultAtLimit: Response | undefined
    for (let index = 0; index < 11; index++) resultAtLimit = await POST(new Request('http://localhost/api/auth/wechat-phone', { method: 'POST', headers, body: '{}' }))
    assert.equal(resultAtLimit?.status, 429)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApp === undefined) delete process.env.WECHAT_APPID; else process.env.WECHAT_APPID = originalApp
    if (originalSecret === undefined) delete process.env.WECHAT_APP_SECRET; else process.env.WECHAT_APP_SECRET = originalSecret
  }
})
