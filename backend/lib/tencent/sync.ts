import { mkdir, open, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { Payload } from 'payload'
import { connectDocs, listRecords, type DocsClient } from './client'
import { getSyncConfig, readSyncFile, syncDirectory, syncErrorMessage, writeSyncFile, type SyncConfig } from './config'
import { cellValue, contentHash, leadCustomerCells, leadWorkflowCells, mapProperty, readLeadWorkflow, type SheetRecord } from './mapping'

type Row = Record<string, unknown> & { id: string | number }
type State = { properties: Record<string, string>; leads: Record<string, { customerHash: string; workflowHash: string }> }
export type SyncReport = {
  startedAt: string; finishedAt?: string; trigger: string
  properties: { created: number; updated: number; unchanged: number }
  leads: { created: number; updated: number; withdrawn: number; followups: number; unchanged: number }
  errors: { area: string; recordId?: string; message: string }[]
}

async function acquireLock() {
  await mkdir(syncDirectory(), { recursive: true })
  const filename = path.join(syncDirectory(), 'sync.lock')
  try { if (Date.now() - (await stat(filename)).mtimeMs > 10 * 60_000) await unlink(filename) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  try { const handle = await open(filename, 'wx'); await handle.close() }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('已有同步正在运行，请稍后刷新'); throw error }
  return () => unlink(filename).catch(() => {})
}

async function imageFile(url: string, filename: string) {
  const address = new URL(url)
  if (address.protocol !== 'https:' || !/^docimg\d*\.docs\.qq\.com$/.test(address.hostname)) throw new Error('图片必须来自腾讯文档图片域名')
  const response = await fetch(address, { signal: AbortSignal.timeout(20_000), redirect: 'error', headers: { Referer: 'https://docs.qq.com/', 'User-Agent': 'zhaoshang-demo-sync/1.0' } })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/') || !response.body) throw new Error('腾讯文档图片读取失败')
  const chunks: Uint8Array[] = []
  const reader = response.body.getReader()
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 10 * 1024 * 1024) throw new Error('图片超过 10MB')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const data = await sharp(Buffer.concat(chunks)).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer()
  return { data, mimetype: 'image/jpeg', name: filename, size: data.length }
}

async function importProperty(payload: Payload, config: SyncConfig, record: SheetRecord, state: State) {
  const mapped = mapProperty(record)
  const key = `tencent:${config.fileId}:${config.propertySheetId}:${record.record_id}`
  const hash = contentHash({ data: mapped.data, images: mapped.images.map(image => image.image_id || image.image_url) })
  const existing = (await payload.find({ collection: 'projects', where: { seedKey: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as Row | undefined
  if (existing && state.properties[key] === hash) return 'unchanged' as const
  const mediaIds: (string | number)[] = []
  for (const image of mapped.images.slice(0, 6)) {
    const mediaKey = `tencent-image:${contentHash({ key, image: image.image_id || image.image_url })}`
    let media = (await payload.find({ collection: 'media', where: { seedKey: { equals: mediaKey } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as Row | undefined
    if (!media) {
      if (!image.image_url) throw new Error('商铺图片缺少可读取地址')
      const file = await imageFile(image.image_url, `tencent-${mapped.isDemo ? 'demo-' : ''}${record.record_id}-${mediaIds.length}.jpg`)
      media = await payload.create({ collection: 'media', data: { seedKey: mediaKey, source: mapped.isDemo ? 'seed_demo' : 'admin', alt: mapped.isDemo ? '腾讯文档样例房源示意图，非真实房源' : '腾讯文档房源图片' }, file, overrideAccess: true }) as Row
    }
    mediaIds.push(media.id)
  }
  const data = { ...mapped.data, coverImage: mediaIds[0], images: mediaIds }
  if (existing) await payload.update({ collection: 'projects', id: existing.id, data, overrideAccess: true })
  else await payload.create({ collection: 'projects', data: { seedKey: key, ...data }, overrideAccess: true })
  state.properties[key] = hash
  return existing ? 'updated' as const : 'created' as const
}

async function allLeads(payload: Payload) {
  const rows: Row[] = []
  let page = 1
  for (;;) {
    const result = await payload.find({ collection: 'leads', page, limit: 100, depth: 0, overrideAccess: true, sort: 'id' })
    rows.push(...result.docs as Row[])
    if (!result.hasNextPage) return rows
    page++
  }
}

async function syncLeads(payload: Payload, docs: DocsClient, config: SyncConfig, state: State, report: SyncReport) {
  const privilege = await docs.call('manage.get_privilege', { file_id: config.fileId })
  if (![0, 1].includes(Number(privilege.policy))) throw new Error('客户资料只能同步到私密或部分成员可见的文档，请先关闭公开共享')
  const leads = await allLeads(payload)
  const records = await listRecords(docs, config.fileId, config.leadSheetId)
  const prefix = `${config.sourceKey}:`
  const byKey = new Map<string, SheetRecord>()
  for (const record of records) {
    const key = cellValue(record, '来源咨询ID')
    if (!key.startsWith(prefix)) continue
    if (byKey.has(key)) throw new Error('客户表存在重复来源咨询ID，请先合并重复记录')
    byKey.set(key, record)
  }
  const liveKeys = new Set(leads.map(lead => `${prefix}${lead.id}`))
  for (const [key, record] of byKey) {
    if (!liveKeys.has(key) && cellValue(record, '记录状态') !== '已撤回') {
      await docs.call('smartsheet.update_records', { file_id: config.fileId, sheet_id: config.leadSheetId, records: [{ record_id: record.record_id, field_values: [{ field: '记录状态', text_value: { items: [{ text: '已撤回', type: 'text' }] } }] }] })
      report.leads.withdrawn++
    }
  }
  for (const lead of leads) {
    const key = `${prefix}${lead.id}`
    try {
      const record = byKey.get(key)
      const customerCells = leadCustomerCells(lead, key)
      const customerHash = contentHash(customerCells)
      const base = state.leads[key]
      let workflowHash = contentHash(leadWorkflowCells(lead))
      let pushWorkflow = !record
      if (record) {
        const remote = readLeadWorkflow(record)
        const remoteHash = contentHash(leadWorkflowCells(remote))
        if (remoteHash !== workflowHash) {
          if (base && workflowHash !== base.workflowHash && remoteHash !== base.workflowHash) throw new Error('后台与文档同时修改了跟进字段，请先统一处理状态与备注')
          if (base && remoteHash === base.workflowHash) pushWorkflow = true
          else {
            await payload.update({ collection: 'leads', id: lead.id, data: remote, overrideAccess: true })
            Object.assign(lead, remote)
            workflowHash = remoteHash
            report.leads.followups++
          }
        }
      }
      const customerChanged = !record || customerCells.some(cell => cellValue(record, cell.field!) !== cellValue({ record_id: '', field_values: [cell] }, cell.field!))
      if (!record || customerChanged || pushWorkflow || cellValue(record, '记录状态') !== '正常') {
        const cells = [...customerCells, ...(pushWorkflow ? leadWorkflowCells(lead) : []), { field: '记录状态', text_value: { items: [{ text: '正常', type: 'text' }] } }, { field: '同步时间', string_value: String(Date.now()) }]
        const args = { file_id: config.fileId, sheet_id: config.leadSheetId, records: [{ ...(record ? { record_id: record.record_id } : {}), field_values: cells }] }
        await docs.call(record ? 'smartsheet.update_records' : 'smartsheet.add_records', args)
        report.leads[record ? 'updated' : 'created']++
      } else report.leads.unchanged++
      state.leads[key] = { customerHash, workflowHash }
    } catch (error) { report.errors.push({ area: '客户咨询', recordId: String(lead.id), message: syncErrorMessage(error) }) }
  }
}

export async function runTencentSync(payload: Payload, trigger = 'manual', suppliedClient?: DocsClient, suppliedConfig?: SyncConfig) {
  const release = await acquireLock()
  let docs: DocsClient | undefined
  const report: SyncReport = { startedAt: new Date().toISOString(), trigger, properties: { created: 0, updated: 0, unchanged: 0 }, leads: { created: 0, updated: 0, withdrawn: 0, followups: 0, unchanged: 0 }, errors: [] }
  let state: State = { properties: {}, leads: {} }
  let stateLoaded = false
  try {
    state = await readSyncFile<State>('state.json', state)
    stateLoaded = true
    const config = suppliedConfig || await getSyncConfig()
    docs = suppliedClient || await connectDocs(config)
    if (config.importProperties) {
      const records = await listRecords(docs, config.fileId, config.propertySheetId)
      for (const record of records) {
        try { report.properties[await importProperty(payload, config, record, state)]++ }
        catch (error) { report.errors.push({ area: '房源', recordId: record.record_id, message: syncErrorMessage(error) }) }
      }
    }
    if (config.exportLeads) await syncLeads(payload, docs, config, state, report)
  } catch (error) { report.errors.push({ area: '连接或同步', message: syncErrorMessage(error) }) }
  finally {
    report.finishedAt = new Date().toISOString()
    try {
      if (stateLoaded) await writeSyncFile('state.json', state)
      await writeSyncFile('last-run.json', report)
    } finally {
      await docs?.close().catch(() => {})
      await release()
    }
  }
  return report
}
