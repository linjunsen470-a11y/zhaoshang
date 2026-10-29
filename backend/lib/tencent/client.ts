import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { SyncConfig } from './config'
import type { SheetRecord } from './mapping'

export interface DocsClient {
  call(method: string, args: Record<string, unknown>): Promise<Record<string, unknown>>
  close(): Promise<void>
}

export function unwrapToolResult(result: Record<string, unknown>): Record<string, unknown> {
  let data = result.structuredContent as Record<string, unknown> | undefined
  if (!data) {
    const content = result.content as { type?: string; text?: string }[] | undefined
    const text = content?.filter(item => item.type === 'text').map(item => item.text || '').join('\n')
    if (text) { try { data = JSON.parse(text) } catch { throw new Error('腾讯文档返回了非 JSON 结果，请检查服务工具响应格式') } }
  }
  if (result.isError || data?.error) throw new Error('腾讯文档操作失败，请检查文档权限、工作表 ID 和字段配置')
  if (!data) throw new Error('腾讯文档未返回可读取的结果')
  return data
}

export async function connectDocs(config: SyncConfig): Promise<DocsClient> {
  if (!config.endpoint) throw new Error('请先在后台填写腾讯文档 MCP 连接地址')
  const client = new Client({ name: 'zhaoshang-demo-sync', version: '1.0.0' })
  const headers = config.token ? { Authorization: `Bearer ${config.token}` } : undefined
  const transport = config.transport === 'sse'
    ? new SSEClientTransport(new URL(config.endpoint), { requestInit: { headers }, eventSourceInit: { fetch: (url, init) => fetch(url, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), ...headers } }) } })
    : new StreamableHTTPClientTransport(new URL(config.endpoint), { requestInit: { headers } })
  try {
    await client.connect(transport, { timeout: 20_000 })
    const names: string[] = []
    let cursor: string | undefined
    do { const page = await client.listTools(cursor ? { cursor } : {}); names.push(...page.tools.map(tool => tool.name)); cursor = page.nextCursor } while (cursor)
    return {
      async call(method, args) {
        const suffix = method.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const name = names.find(name => name.replace(/[^a-z0-9]/gi, '_').toLowerCase().endsWith(suffix))
        if (!name) throw new Error(`MCP 服务缺少 ${method} 工具`)
        return unwrapToolResult(await client.callTool({ name, arguments: args }, undefined, { timeout: 30_000 }) as Record<string, unknown>)
      },
      close: () => client.close(),
    }
  } catch (error) { await client.close().catch(() => {}); throw error }
}

export async function listRecords(client: DocsClient, fileId: string, sheetId: string, viewId?: string): Promise<SheetRecord[]> {
  const records: SheetRecord[] = []
  let offset = 0
  for (;;) {
    const page = await client.call('smartsheet.list_records', { file_id: fileId, sheet_id: sheetId, ...(viewId ? { view_id: viewId } : {}), offset, limit: 100 })
    if (!Array.isArray(page.records)) throw new Error('腾讯文档记录响应缺少 records')
    for (const row of page.records as SheetRecord[]) {
      if (typeof row.record_id !== 'string' || !row.record_id.trim() || records.some(previous => previous.record_id === row.record_id)) throw new Error('记录 ID 缺失或重复，停止缺失对账')
      records.push(row)
    }
    if (page.has_more === undefined) throw new Error('腾讯文档缺少分页完整性标记')
    if (page.has_more === false || page.has_more === 'false') {
      if (page.total !== undefined && Number(page.total) !== records.length) throw new Error('腾讯文档记录总数不一致')
      return records
    }
    const next = Number(page.next)
    if (!Number.isSafeInteger(next) || next <= offset) throw new Error('腾讯文档分页没有前进，已停止同步')
    offset = next
  }
}
