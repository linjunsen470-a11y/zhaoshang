import { basename, join } from 'path'
import { readFile } from 'fs/promises'
import { getPayloadInstance } from '../../../_shared/payloadApi'
import { verifyMediaToken } from '../../../_shared/tokens'

type Args = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Args) {
  const { id } = await params
  const owner = verifyMediaToken(new URL(request.url).searchParams.get('token'), id)
  if (!owner) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  try {
    const payload = await getPayloadInstance()
    const media = await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
    if (media.source !== 'lead_attachment' || media.ownerOpenId !== owner) return new Response(null, { status: 404 })
    const filename = basename(String(media.filename || ''))
    const mimeType = String(media.mimeType || '')
    if (!filename || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return new Response(null, { status: 404 })
    const data = await readFile(join(process.cwd(), 'media', filename))
    return new Response(new Uint8Array(data), { headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch { return new Response(null, { status: 404 }) }
}
