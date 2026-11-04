import { pageNumber } from '../../../lib/commercial'
import { verifyAuthToken } from '../_shared/auth'
import { getPayloadInstance, json } from '../_shared/payloadApi'

export async function GET(request: Request) {
  const auth = verifyAuthToken(request.headers.get('authorization'))
  if (!auth) return json({ error: '未登录或登录已过期' }, 401)

  const params = new URL(request.url).searchParams
  try {
    const payload = await getPayloadInstance()
    const result = await payload.find({
      collection: 'favorites',
      where: { ownerOpenId: { equals: auth.openid } },
      page: pageNumber(params.get('page'), 1, 100000),
      limit: pageNumber(params.get('limit'), 100, 100),
      sort: ['-createdAt', '-id'],
      depth: 0,
      overrideAccess: true,
    })
    return Response.json({
      docs: result.docs.map(doc => ({ projectId: doc.projectId, createdAt: doc.createdAt })),
      page: result.page,
      hasNextPage: result.hasNextPage,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[GET /api/favorites] query failed:', error instanceof Error ? error.name : 'UnknownError')
    return json({ error: '收藏暂时无法同步，请稍后重试' }, 500)
  }
}
