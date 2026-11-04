import type { Payload, PayloadRequest } from 'payload'

type RecordWithAttachments = { attachments?: unknown; customerSnapshot?: unknown }
export function leadAttachmentIds(doc: RecordWithAttachments): (string | number)[] {
  const snapshot = doc.customerSnapshot as { attachmentIds?: unknown } | undefined
  const values = [...(Array.isArray(doc.attachments) ? doc.attachments : []),
    ...(Array.isArray(snapshot?.attachmentIds) ? snapshot.attachmentIds : [])]
  return [...new Set(values.map(value => typeof value === 'object' && value ? value.id : value)
    .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number'))]
}

/** Recheck every reference, including immutable snapshots, before deleting. */
export async function deleteOrphanAttachments(payload: Payload, ids: (string | number)[], owner: string, req?: PayloadRequest, dryRun = false) {
  if (!owner || !ids.length) return 0
  const referenced = new Set<string>()
  let page = 1
  for (;;) {
    const result = await payload.find({ collection: 'leads', select: { attachments: true, customerSnapshot: true },
      page, limit: 100, sort: 'id', depth: 0, overrideAccess: true, req })
    for (const lead of result.docs) for (const id of leadAttachmentIds(lead)) referenced.add(String(id))
    if (!result.hasNextPage) break
    page++
  }
  let count = 0
  for (const id of new Set(ids)) {
    if (referenced.has(String(id))) continue
    const projects = await payload.count({ collection: 'projects', where: { or: [
      { coverImage: { equals: id } }, { images: { contains: id } },
    ] }, overrideAccess: true, req })
    if (projects.totalDocs) continue
    const media = await payload.findByID({ collection: 'media', id, overrideAccess: true, req, disableErrors: true })
    if (!media || media.source !== 'lead_attachment' || media.ownerOpenId !== owner) continue
    if (!dryRun) await payload.delete({ collection: 'media', id, overrideAccess: true, req })
    count++
  }
  return count
}

/** Seven-day grace period protects abandoned/in-progress form uploads. */
export async function cleanupExpiredAttachments(payload: Payload, dryRun = true, now = Date.now()) {
  const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  let cursor: string | number | undefined
  let count = 0
  for (;;) {
    const result = await payload.find({ collection: 'media', where: { and: [
      { source: { equals: 'lead_attachment' } }, { createdAt: { less_than: cutoff } },
      ...(cursor === undefined ? [] : [{ id: { greater_than: cursor } }]),
    ] }, sort: 'id', limit: 100, depth: 0, overrideAccess: true })
    if (!result.docs.length) break
    const owners = new Map<string, (string | number)[]>()
    for (const media of result.docs) {
      const owner = String(media.ownerOpenId || '')
      owners.set(owner, [...(owners.get(owner) || []), media.id])
    }
    for (const [owner, ids] of owners) count += await deleteOrphanAttachments(payload, ids, owner, undefined, dryRun)
    cursor = result.docs[result.docs.length - 1].id
  }
  return { dryRun, cutoff, count }
}
