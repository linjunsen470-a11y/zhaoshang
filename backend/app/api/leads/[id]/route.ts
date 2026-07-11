import {
  getPayloadInstance,
  json,
  mapLead,
  sanitizeLeadUpdateInput,
  validateAttachmentOwnership,
  LEAD_ID_OFFSET,
} from '../../_shared/payloadApi'
import { requireAuth } from '../../_shared/auth'

type Args = {
  params: Promise<{ id: string }>
}

function parseLeadId(rawId: string): string {
  const idNum = parseInt(rawId, 10)
  if (!isNaN(idNum) && idNum > LEAD_ID_OFFSET) {
    return String(idNum - LEAD_ID_OFFSET)
  }
  return rawId
}


export async function GET(request: Request, { params }: Args) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : '未登录或登录已过期' }, 401)
  }

  const { id: rawId } = await params
  const id = parseLeadId(rawId)
  const payload = await getPayloadInstance()

  try {
    const lead = await payload.findByID({
      collection: 'leads',
      id,
      overrideAccess: true,
    })

    if (!lead) {
      return json({ error: '线索不存在' }, 404)
    }

    if (lead.submitterOpenId !== auth.openid) {
      return json({ error: '无权查看此线索' }, 403)
    }

    return json(await mapLead(lead))
  } catch (err) {
    console.error('Failed to fetch lead:', err)
    return json({ error: '线索不存在' }, 404)
  }
}

export async function PUT(request: Request, { params }: Args) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : '未登录或登录已过期' }, 401)
  }

  const { id: rawId } = await params
  const id = parseLeadId(rawId)
  let input: Record<string, unknown>
  try {
    input = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: '无效的 JSON 请求体' }, 400)
  }
  const payload = await getPayloadInstance()

  try {
    // 1. 获取现有线索以核对所有权
    const lead = await payload.findByID({
      collection: 'leads',
      id,
      overrideAccess: true,
    })

    if (!lead) {
      return json({ error: '线索不存在' }, 404)
    }

    // 2. 校验当前登录用户 OpenID 与线索提交人是否一致
    if (lead.submitterOpenId !== auth.openid) {
      return json({ error: '无权修改此线索' }, 403)
    }

    const attachmentError = await validateAttachmentOwnership(input.attachments, auth.openid)
    if (attachmentError) return attachmentError

    const doc = await payload.update({
      collection: 'leads',
      id,
      data: sanitizeLeadUpdateInput(input, auth.openid, {
        leadType: lead.leadType,
        sourceChannel: lead.sourceChannel,
      }),
      overrideAccess: true,
    })
    return json(await mapLead(doc))
  } catch (err) {
    console.error('Failed to update lead:', err)
    return json({ error: '线索不存在或更新失败' }, 404)
  }
}

export async function DELETE(request: Request, { params }: Args) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : '未登录或登录已过期' }, 401)
  }

  const { id: rawId } = await params
  const id = parseLeadId(rawId)
  const payload = await getPayloadInstance()

  try {
    // 1. 获取现有线索以核对所有权
    const lead = await payload.findByID({
      collection: 'leads',
      id,
      overrideAccess: true,
    })

    if (!lead) {
      return json({ error: '线索不存在' }, 404)
    }

    // 2. 校验所有者
    if (lead.submitterOpenId !== auth.openid) {
      return json({ error: '无权删除此线索' }, 403)
    }

    // 3. 执行删除
    await payload.delete({
      collection: 'leads',
      id,
      overrideAccess: true,
    })
    return json({ success: true })
  } catch (err) {
    console.error('Failed to delete lead:', err)
    return json({ error: '删除线索失败' }, 500)
  }
}



