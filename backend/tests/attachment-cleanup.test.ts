import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload, PayloadRequest } from 'payload'
import { deleteOrphanAttachments, cleanupExpiredAttachments } from '../lib/attachmentCleanup'
import { Projects } from '../collections/Projects'

test('native project access denies anonymous reads and retains staff access', async () => {
  const read = Projects.access!.read!
  assert.equal(await read({ req: { user: null } as PayloadRequest }), false)
  for (const role of ['admin', 'editor']) {
    assert.equal(await read({ req: { user: { role } } as unknown as PayloadRequest }), true)
  }
})

test('cleanup preserves working, snapshot, project, foreign and public files; dry run never deletes', async () => {
  const deleted: unknown[] = []
  const payload = {
    find: async () => ({ docs: [{ attachments: [1], customerSnapshot: { attachmentIds: [2] } }], hasNextPage: false }),
    count: async ({ where }: { where: { or: { coverImage?: { equals: number } }[] } }) => ({ totalDocs: where.or[0].coverImage?.equals === 3 ? 1 : 0 }),
    findByID: async ({ id }: { id: number }) => ({ id, source: id === 5 ? 'admin' : 'lead_attachment', ownerOpenId: id === 4 ? 'other' : 'owner' }),
    delete: async ({ id }: { id: number }) => { deleted.push(id) },
  } as unknown as Payload
  assert.equal(await deleteOrphanAttachments(payload, [1, 2, 3, 4, 5, 6], 'owner', undefined, true), 1)
  assert.deepEqual(deleted, [])
  assert.equal(await deleteOrphanAttachments(payload, [1, 2, 3, 4, 5, 6], 'owner'), 1)
  assert.deepEqual(deleted, [6])
})

test('expired cleanup uses a grace period and cursor pagination while deleting', async () => {
  const queries: unknown[] = []
  let batches = 0
  const payload = {
    find: async (args: { collection: string; where?: unknown }) => {
      if (args.collection === 'leads') return { docs: [], hasNextPage: false }
      queries.push(args.where)
      return { docs: batches++ === 0 ? [{ id: 7, ownerOpenId: 'owner' }] : [] }
    },
    count: async () => ({ totalDocs: 0 }),
    findByID: async () => ({ source: 'lead_attachment', ownerOpenId: 'owner' }),
    delete: async () => {},
  } as unknown as Payload
  const report = await cleanupExpiredAttachments(payload, false, Date.parse('2026-11-05T00:00:00Z'))
  assert.equal(report.count, 1)
  assert.equal(report.cutoff, '2026-10-29T00:00:00.000Z')
  assert.match(JSON.stringify(queries[0]), /2026-10-29/)
  assert.match(JSON.stringify(queries[1]), /greater_than.*7/)
})
