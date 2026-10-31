import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inquiryTimeFilters } from '../lib/inquiryFilters'

test('whole dates use China timezone and an exclusive next-day boundary', () => {
  const result = inquiryTimeFilters(new URLSearchParams('from=2026-10-31&to=2026-10-31&sort=asc'))
  assert.deepEqual(result, { where: [
    { createdAt: { greater_than_equal: '2026-10-30T16:00:00.000Z' } },
    { createdAt: { less_than: '2026-10-31T16:00:00.000Z' } },
  ], sort: ['createdAt', 'id'] })
})
test('rejects invalid dates, reversed ranges and unsupported sorts', () => {
  for (const query of ['from=2026-02-29', 'to=2026-13-01', 'from=26-01-01', 'from=2026-11-02&to=2026-11-01', 'sort=phone']) {
    assert.throws(() => inquiryTimeFilters(new URLSearchParams(query)))
  }
})
test('supports leap days, open ranges and a stable default newest-first order', () => {
  assert.equal(inquiryTimeFilters(new URLSearchParams('to=2024-02-29')).where.length, 1)
  assert.deepEqual(inquiryTimeFilters(new URLSearchParams()), { where: [], sort: ['-createdAt', '-id'] })
})
