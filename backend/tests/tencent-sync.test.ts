import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServer } from 'node:http'
import type { Payload } from 'payload'
import { cellValue, leadCustomerCells, mapProperty, textCell, type SheetRecord } from '../lib/tencent/mapping'
import { connectDocs, listRecords, unwrapToolResult, type DocsClient } from '../lib/tencent/client'
import { publicSyncConfig, saveSyncConfig, getSyncConfig, type SyncConfig } from '../lib/tencent/config'
import { runTencentSync } from '../lib/tencent/sync'

const config: SyncConfig = { endpoint: 'https://mcp.example.test/mcp?key=secret', token: 'secret-token', transport: 'http', fileId: 'file', propertySheetId: 'properties', leadSheetId: 'leads', sourceKey: 'test-demo', enabled: false, intervalMinutes: 15, importProperties: false, exportLeads: true }
const lead = { id: 42, name: '测试客户', phone: '13800000000', leadType: 'leasing', createdAt: '2026-10-24T01:00:00Z', status: 'new', internalNote: '', submitterOpenId: 'private-openid', customerSnapshot: { private: true }, attachments: [99], businessType: '粉面' }

async function isolated(t: { after: (fn: () => Promise<void>) => void }) {
  const testRoot = fileURLToPath(new URL('../../scratch/tencent-tests/', import.meta.url))
  await mkdir(testRoot, { recursive: true })
  const directory = await mkdtemp(path.join(testRoot, 'case-'))
  const original = process.env.TENCENT_SYNC_DIR
  process.env.TENCENT_SYNC_DIR = directory
  t.after(async () => {
    if (original === undefined) delete process.env.TENCENT_SYNC_DIR
    else process.env.TENCENT_SYNC_DIR = original
    if (!path.resolve(directory).startsWith(path.resolve(testRoot) + path.sep)) throw new Error('Unexpected cleanup directory')
    await rm(directory, { recursive: true, force: true })
  })
}

function fixture() {
  const local = [structuredClone(lead)]
  const records: SheetRecord[] = []
  const writes: string[] = []
  const payload = {
    async find() { return { docs: local.map(row => ({ ...row })), hasNextPage: false } },
    async update(args: { data: Record<string, unknown> }) { Object.assign(local[0], args.data); return local[0] },
  } as unknown as Payload
  const docs: DocsClient = {
    async call(method, args) {
      if (method === 'manage.get_privilege') return { policy: 1 }
      if (method === 'smartsheet.list_records') return { records: structuredClone(records), has_more: false }
      writes.push(method)
      if (method === 'smartsheet.add_records') {
        const rows = args.records as { field_values: SheetRecord['field_values'] }[]
        records.push(...rows.map((row, index) => ({ record_id: `remote-${records.length + index}`, field_values: row.field_values })))
      } else if (method === 'smartsheet.update_records') {
        for (const patch of args.records as SheetRecord[]) {
          const row = records.find(row => row.record_id === patch.record_id)!
          const fields = new Map(row.field_values?.map(cell => [cell.field, cell]))
          for (const cell of patch.field_values || []) fields.set(cell.field, cell)
          row.field_values = [...fields.values()]
        }
      } else throw new Error(`Unexpected remote mutation: ${method}`)
      return {}
    }, async close() {},
  }
  return { local, records, writes, payload, docs }
}

test('customer export whitelists business data and omits identity, snapshot and attachments', () => {
  const cells = JSON.stringify(leadCustomerCells(lead, 'test-demo:42'))
  assert.ok(cells.includes('13800000000'))
  for (const excluded of ['private-openid', 'customerSnapshot', 'attachments', 'private']) assert.equal(cells.includes(excluded), false)
})

test('property import preserves rental units and separates base rent from commission', () => {
  const record = { record_id: 'p1', field_values: [textCell('城市', '东莞市'), textCell('行政区', '松山湖'), textCell('学校名称', '示例学校'), textCell('校区/位置', 'A01'), textCell('招租状态', '招租中'), textCell('租金单位', '元/㎡/月'), { field: '租金', number_value: 350 }, { field: '商铺面积（㎡）', number_value: 68.8 }, { field: '抽成比例（%）', number_value: 5 }, { field: '商铺图片', image_value: { items: [{ image_url: 'https://docimg3.docs.qq.com/image/example.jpg' }] } }] }
  const mapped = mapProperty(record)
  assert.equal(mapped.data.monthlyRentMin, 24080)
  assert.ok(mapped.data.feeText.includes('5%'))
  assert.ok(mapped.data.feeText.includes('待核实'))
  assert.equal(mapped.isDemo, true)
  assert.equal(mapped.data.title.startsWith('【演示】'), true)
})

test('workplace rows use the explicit source scene and venue without changing legacy school fallback', () => {
  for (const [label, expected] of [['工业园区', 'industrial_park'], ['写字楼', 'office']]) {
    const mapped = mapProperty({ record_id: 'workplace', field_values: [
      textCell('城市', '广州市'), textCell('行政区', '天河区'), textCell('场所名称', '示例工作场所'), textCell('场景', label),
      textCell('校区/位置', 'A01'), textCell('招租状态', '招租中'),
      { field: '商铺图片', image_value: { items: [{ image_url: 'https://docimg3.docs.qq.com/image/example.jpg' }] } },
    ] })
    assert.equal(mapped.data.businessScene, expected)
    assert.equal(mapped.data.venueName, '示例工作场所')
    assert.equal(mapped.data.schoolName, '')
    assert.equal(mapped.isDemo, true)
  }
})

test('repeated sync is idempotent; document follow-up updates only working fields', async t => {
  await isolated(t)
  const f = fixture()
  assert.equal((await runTencentSync(f.payload, 'test', f.docs, config)).leads.created, 1)
  assert.equal((await runTencentSync(f.payload, 'test', f.docs, config)).leads.unchanged, 1)
  assert.equal(f.records.length, 1)
  f.records[0].field_values!.find(cell => cell.field === '处理状态')!.option_value = { items: [{ text: '已联系' }] }
  f.records[0].field_values!.find(cell => cell.field === '内部跟进备注')!.text_value = { items: [{ text: '已确认看铺意向', type: 'text' }] }
  const result = await runTencentSync(f.payload, 'test', f.docs, config)
  assert.equal(result.leads.followups, 1)
  assert.equal(f.local[0].status, 'contacted')
  assert.equal(f.local[0].phone, lead.phone)
  assert.deepEqual(f.local[0].customerSnapshot, lead.customerSnapshot)
  assert.equal(result.errors.length, 0)
})

test('missing local consultations are marked withdrawn without deleting remote rows', async t => {
  await isolated(t)
  const f = fixture()
  await runTencentSync(f.payload, 'test', f.docs, config)
  f.local.length = 0
  const report = await runTencentSync(f.payload, 'test', f.docs, config)
  assert.equal(report.leads.withdrawn, 1)
  assert.equal(f.records.length, 1)
  assert.equal(cellValue(f.records[0], '记录状态'), '已撤回')
  assert.equal(f.writes.includes('smartsheet.delete_records'), false)
})

test('public document blocks all customer writes', async t => {
  await isolated(t)
  const f = fixture()
  const docs: DocsClient = { async call() { return { policy: 2 } }, async close() {} }
  const report = await runTencentSync(f.payload, 'test', docs, config)
  assert.ok(report.errors[0].message.includes('私密或部分成员'))
  assert.equal(f.writes.length, 0)
})

test('MCP pagination refuses stalled cursors and tool business errors', async () => {
  await assert.rejects(() => listRecords({ async call() { return { records: [], has_more: true, next: 0 } }, async close() {} }, 'f', 's'), /分页没有前进/)
  assert.throws(() => unwrapToolResult({ content: [{ type: 'text', text: '{"error":"denied"}' }] }), /操作失败/)
})

test('saved secrets never appear in browser configuration', async t => {
  await isolated(t)
  const saved = await saveSyncConfig(config)
  assert.equal(JSON.stringify(saved).includes('secret'), false)
  assert.equal(saved.connected, true)
  assert.equal(publicSyncConfig(await getSyncConfig()).endpointHost, 'mcp.example.test')
  await saveSyncConfig({ token: '', endpoint: '' })
  assert.equal((await getSyncConfig()).token, 'secret-token')
})

test('real MCP HTTP transport initializes and calls the service with server-side authorization', async () => {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST') { response.writeHead(405).end(); return }
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const message = JSON.parse(Buffer.concat(chunks).toString())
    if (message.id === undefined) { response.writeHead(202).end(); return }
    let result: unknown
    if (message.method === 'initialize') result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'isolated-test-service', version: '1' } }
    else if (message.method === 'tools/list') result = { tools: [{ name: 'smartsheet.list_records', inputSchema: { type: 'object', properties: {} } }] }
    else if (message.method === 'tools/call') {
      assert.equal(request.headers.authorization, 'Bearer test-only-token')
      assert.equal(message.params.arguments.file_id, 'file')
      result = { content: [{ type: 'text', text: JSON.stringify({ records: [], has_more: false }) }] }
    } else throw new Error('Unexpected MCP method')
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  let client: DocsClient | undefined
  try {
    client = await connectDocs({ ...config, token: 'test-only-token', endpoint: `http://127.0.0.1:${address.port}/mcp` })
    assert.deepEqual(await listRecords(client, 'file', 'leads'), [])
  } finally { await client?.close(); server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
