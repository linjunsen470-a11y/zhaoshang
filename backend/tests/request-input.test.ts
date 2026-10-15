import assert from 'node:assert/strict'
import test from 'node:test'
import { readJsonObject, RequestInputError } from '../app/api/_shared/requestInput'

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
