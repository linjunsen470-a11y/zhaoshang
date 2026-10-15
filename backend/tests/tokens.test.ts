import assert from 'node:assert/strict'
import test from 'node:test'
import { signAuthToken, verifyAuthToken, signMediaToken, verifyMediaToken } from '../app/api/_shared/tokens'

test('auth tokens reject expiration, tampering and additional segments', () => {
  const token = signAuthToken('owner')
  assert.equal(verifyAuthToken(`Bearer ${token}`)?.openid, 'owner')
  for (const invalid of [token + '.extra', token + 'x', signAuthToken('owner', -1), signAuthToken('')]) assert.equal(verifyAuthToken(invalid), null)
})

test('image signatures are bound to the image, purpose and expiry', () => {
  const token = signMediaToken('1', 'owner')
  assert.equal(verifyMediaToken(token, '1'), 'owner')
  assert.equal(verifyMediaToken(token, '2'), null)
  assert.equal(verifyMediaToken(signMediaToken('1', 'owner', -1), '1'), null)
  assert.equal(verifyMediaToken(signAuthToken('owner'), '1'), null)
  assert.equal(verifyAuthToken(token), null)
})
