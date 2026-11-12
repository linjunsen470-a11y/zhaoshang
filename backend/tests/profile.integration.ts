import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { signAuthToken } from '../app/api/_shared/tokens'

test('account profile is private, merges separate edits, and distinguishes verified phones', async () => {
  const database = new URL(process.env.DATABASE_URI || '')
  assert.equal(database.hostname, '127.0.0.1')
  assert.equal(database.pathname, '/profile_integration')
  const { GET, PUT } = await import('../app/api/profile/route')
  const user = randomUUID()
  const call = (owner?: string, input?: Record<string, unknown>) => {
    const req = new Request('http://localhost/api/profile', {
      headers: owner ? { Authorization: 'Bearer ' + signAuthToken(owner) } : {},
      method: input ? 'PUT' : 'GET',
      body: input && JSON.stringify(input),
    })
    return input ? PUT(req) : GET(req)
  }
  assert.equal((await call()).status, 401)
  assert.equal((await call(undefined, { nickname: 'hi' })).status, 401)
  assert.equal((await call(user, { phoneVerified: true })).status, 400)
  assert.equal((await call(user, { avatar: 'abcd' })).status, 400)
  const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).png().toBuffer()
  const results = await Promise.all([call(user, { avatar: photo.toString('base64') }), call(user, { nickname: '林女士', phone: '13812345678' })])
  assert.deepEqual(results.map(r => r.status), [200, 200])
  const saved = await (await call(user)).json()
  assert.equal(saved.nickname, '林女士')
  assert.equal(saved.phone, '13812345678')
  assert.equal(saved.phoneVerified, false)
  assert.match(saved.avatar, /^data:image\/jpeg;base64,/)
  const other = await (await call(randomUUID())).json()
  assert.deepEqual(other, { nickname: '', phone: '', phoneVerified: false, avatar: '' })
  const fetcher = globalThis.fetch
  process.env.WECHAT_APPID = 'profile-test-app'
  process.env.WECHAT_APP_SECRET = 'profile-test-secret'
  try {
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/stable_token')) return Response.json({ access_token: 'test' })
      assert.equal(JSON.parse(String(init?.body)).code, 'authorized-code')
      return Response.json({ errcode: 0, phone_info: { purePhoneNumber: '13912345678', countryCode: '86', watermark: { appid: 'profile-test-app' } } })
    }
    const bound = await (await call(user, { phoneCode: 'authorized-code' })).json()
    assert.equal(bound.phoneVerified, true)
    assert.equal(bound.phone, '13912345678')
    assert.equal(bound.avatar, saved.avatar)
  } finally { globalThis.fetch = fetcher }
  assert.deepEqual(await (await call(user, { phone: '', avatar: '', nickname: '' })).json(), other)
})
