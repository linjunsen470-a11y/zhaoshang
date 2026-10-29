import { basename, join } from 'path'
import { readFile } from 'fs/promises'
import { getPayloadInstance } from '../../../../_shared/payloadApi'
import { getClientIp, takeRateLimit } from '../../../../_shared/rateLimit'

type Args = { params: Promise<{ id: string; mediaId: string }> }

function relationId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return ''
}

export async function GET(request: Request, { params }: Args) {
  const rate = takeRateLimit(`equipment-image:${getClientIp(request)}`, 180, 60 * 1000)
  if (!rate.allowed) {
    return new Response(null, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } })
  }

  const { id: publicId, mediaId } = await params
  const payload = await getPayloadInstance()

  try {
    const lead = await payload.findByID({
      collection: 'leads',
      id: publicId,
      depth: 0,
      overrideAccess: true,
    })
    const publication = (lead.equipmentPublication || {}) as Record<string, unknown>
    const allowed = ['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(String(lead.leadType || ''))
      && publication.status === 'online'
      && Array.isArray(lead.attachments)
      && lead.attachments.some(item => relationId(item) === mediaId)
    if (!allowed) return new Response(null, { status: 404 })

    const media = await payload.findByID({ collection: 'media', id: mediaId, overrideAccess: true })
    if (media.source !== 'lead_attachment' || media.ownerOpenId !== lead.submitterOpenId) {
      return new Response(null, { status: 404 })
    }

    const filename = basename(String(media.filename || ''))
    const mimeType = String(media.mimeType || '')
    if (!filename || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return new Response(null, { status: 404 })
    }

    const data = await readFile(join(process.cwd(), 'media', filename))
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
