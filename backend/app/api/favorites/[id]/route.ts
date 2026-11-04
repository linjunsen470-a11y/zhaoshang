import { publicCommercialWhere } from '../../../../lib/commercial'
import type { Where } from 'payload'
import { verifyAuthToken } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'
import { takeRateLimit } from '../../_shared/rateLimit'

type Args = { params: Promise<{ id: string }> }

async function input(request: Request, params: Args['params']) {
  const auth = verifyAuthToken(request.headers.get('authorization'))
  if (!auth) return { error: json({ error: '未登录或登录已过期' }, 401) }
  const { id } = await params
  if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) return { error: json({ error: '房源编号无效' }, 400) }
  const rate = takeRateLimit(`favorite-write:${auth.openid}`, 300, 10 * 60 * 1000)
  if (!rate.allowed) return { error: Response.json({ error: '操作过于频繁，请稍后重试' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }) }
  return { owner: auth.openid, projectId: id }
}

export async function PUT(request: Request, { params }: Args) {
  const value = await input(request, params)
  if (value.error) return value.error
  const { owner, projectId } = value
  const where: Where = { and: [{ ownerOpenId: { equals: owner } }, { projectId: { equals: projectId } }] }
  try {
    const payload = await getPayloadInstance()
    const existing = await payload.find({ collection: 'favorites', where, limit: 1, depth: 0, overrideAccess: true })
    if (existing.docs.length) return json({ success: true })

    const project = await payload.find({
      collection: 'projects',
      where: { and: [{ id: { equals: projectId } }, publicCommercialWhere()] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!project.docs.length) return json({ error: '房源已不可用，无法同步收藏' }, 404)
    try {
      await payload.create({ collection: 'favorites', data: { ownerOpenId: owner, projectId }, overrideAccess: true })
    } catch (error) {
      // Concurrent identical PUTs are successful once the unique pair exists.
      const duplicate = await payload.find({ collection: 'favorites', where, limit: 1, depth: 0, overrideAccess: true })
      if (!duplicate.docs.length) throw error
    }
    return json({ success: true })
  } catch (error) {
    console.error('[PUT /api/favorites] update failed:', error instanceof Error ? error.name : 'UnknownError')
    return json({ error: '收藏暂时无法同步，请稍后重试' }, 500)
  }
}

export async function DELETE(request: Request, { params }: Args) {
  const value = await input(request, params)
  if (value.error) return value.error
  try {
    const payload = await getPayloadInstance()
    await payload.delete({
      collection: 'favorites',
      where: { and: [{ ownerOpenId: { equals: value.owner } }, { projectId: { equals: value.projectId } }] },
      overrideAccess: true,
    })
    return json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/favorites] update failed:', error instanceof Error ? error.name : 'UnknownError')
    return json({ error: '收藏暂时无法同步，请稍后重试' }, 500)
  }
}
