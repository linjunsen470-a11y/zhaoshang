import assert from 'node:assert/strict'
import test from 'node:test'
import { readJsonObject, RequestInputError, sameOrigin } from '../app/api/_shared/requestInput'

test('JSON boundaries reject primitives, arrays and malformed bodies', async () => {
  for (const body of ['null', '[]', '"text"', '1', 'true', '{']) {
    await assert.rejects(readJsonObject(new Request('http://test', { method: 'POST', body })), error => error instanceof RequestInputError && error.status === 400)
  }
  assert.deepEqual(await readJsonObject(new Request('http://test', { method: 'POST', body: '{"name":"客户"}' })), { name: '客户' })
})

test('actual UTF-8 body size is limited even without a truthful Content-Length', async () => {
  const body = JSON.stringify({ remark: '中'.repeat(40) })
  await assert.rejects(readJsonObject(new Request('http://test', { method: 'POST', body, headers: { 'Content-Length': '1' } }), 100), error => error instanceof RequestInputError && error.status === 413)
  assert.deepEqual(await readJsonObject(new Request('http://test', { method: 'POST', body: '{}' }), 2), {})
})

test('staff writes accept same-origin browser requests including the HTTPS proxy and reject foreign or absent origins', () => {
  const request = (headers: Record<string, string>) => new Request('http://localhost:3000/api/admin/inquiries', { method: 'PATCH', headers })
  assert.equal(sameOrigin(request({ origin: 'http://localhost:3000' })), true)
  assert.equal(sameOrigin(request({ origin: 'https://api.example.test', host: 'api.example.test', 'x-forwarded-proto': 'https' })), true)
  assert.equal(sameOrigin(request({ 'sec-fetch-site': 'same-origin' })), true)
  const invalidHeaders: Record<string, string>[] = [{}, { origin: 'null' }, { origin: 'https://evil.test' }, { 'sec-fetch-site': 'same-site' }, { 'sec-fetch-site': 'cross-site' }, { origin: 'https://evil.test', 'sec-fetch-site': 'same-origin' }]
  for (const headers of invalidHeaders) {
    assert.equal(sameOrigin(request(headers)), false)
  }
})
