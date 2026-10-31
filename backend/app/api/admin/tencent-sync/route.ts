import { getAuthenticatedStaff } from '../../_shared/auth'
import { getPayloadInstance, json } from '../../_shared/payloadApi'
import { readJsonObject, jsonInputError, sameOrigin } from '../../_shared/requestInput'
import { connectDocs } from '../../../../lib/tencent/client'
import { getSyncConfig, publicSyncConfig, readSyncFile, saveSyncConfig, syncErrorMessage } from '../../../../lib/tencent/config'
import { runTencentSync, type SyncReport } from '../../../../lib/tencent/sync'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET() {
  if (!await getAuthenticatedStaff()) return json({ error: '请先登录后台' }, 401)
  try {
    const [config, lastRun, worker] = await Promise.all([
      getSyncConfig(), readSyncFile<SyncReport | null>('last-run.json', null),
      readSyncFile<{ heartbeatAt: string | null }>('worker.json', { heartbeatAt: null }),
    ])
    const payload = await getPayloadInstance()
    const [properties, leads] = await Promise.all([
      payload.count({ collection: 'projects', where: { seedKey: { contains: `tencent:${config.fileId}:` } }, overrideAccess: true }),
      payload.count({ collection: 'leads', overrideAccess: true }),
    ])
    return json({ config: publicSyncConfig(config), lastRun, workerRunning: Boolean(worker.heartbeatAt && Date.now() - Date.parse(worker.heartbeatAt) < 30_000), counts: { properties: properties.totalDocs, leads: leads.totalDocs } })
  } catch (error) { return json({ error: syncErrorMessage(error) }, 500) }
}

export async function PUT(request: Request) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return json({ error: '请先登录后台' }, 401)
  if (staff.role !== 'admin') return json({ error: '只有管理员可以修改连接配置' }, 403)
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403)
  let input: Record<string, unknown>
  try { input = await readJsonObject(request) } catch (error) { return jsonInputError(error) }
  try { return json({ config: await saveSyncConfig(input) }) }
  catch (error) { return json({ error: syncErrorMessage(error) }, 400) }
}

export async function POST(request: Request) {
  if (!await getAuthenticatedStaff()) return json({ error: '请先登录后台' }, 401)
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403)
  let input: Record<string, unknown>
  try { input = await readJsonObject(request) } catch (error) { return jsonInputError(error) }
  try {
    if (input.action === 'test') {
      const config = await getSyncConfig()
      const docs = await connectDocs(config)
      try {
        const tables = await docs.call('smartsheet.list_tables', { file_id: config.fileId })
        const sheets = tables.sheets as { sheet_id: string }[] | undefined
        for (const id of [config.importProperties ? config.propertySheetId : '', config.exportLeads ? config.leadSheetId : ''].filter(Boolean)) {
          if (!sheets?.some(sheet => sheet.sheet_id === id)) throw new Error('配置的工作表不存在或当前授权无权访问')
        }
        if (config.importProperties) {
          const fields = await docs.call('smartsheet.list_fields', { file_id: config.fileId, sheet_id: config.propertySheetId, limit: 100 })
          const titles = new Set((fields.fields as { field_title: string }[] || []).map(field => field.field_title))
          for (const title of ['城市', '行政区', '招租状态', '商铺图片']) if (!titles.has(title)) throw new Error(`房源表缺少字段：${title}`)
        }
        if (config.exportLeads) {
          const privilege = await docs.call('manage.get_privilege', { file_id: config.fileId })
          if (![0, 1].includes(Number(privilege.policy))) throw new Error('客户资料目标文档需要设置为私密或部分成员可见')
          const fields = await docs.call('smartsheet.list_fields', { file_id: config.fileId, sheet_id: config.leadSheetId, limit: 100 })
          const titles = new Set((fields.fields as { field_title: string }[] || []).map(field => field.field_title))
          for (const title of ['来源咨询ID', '客户称呼', '联系电话', '咨询类型', '意向场景', '经营品类', '预算', '意向区域', '关联房源', '客户说明', '提交时间', '处理状态', '内部跟进备注', '同步时间', '记录状态']) if (!titles.has(title)) throw new Error(`客户表缺少字段：${title}`)
        }
        return json({ message: '连接成功，已确认工作表可访问' })
      } finally { await docs.close() }
    }
    if (input.action !== 'sync') return json({ error: '操作无效' }, 400)
    const report = await runTencentSync(await getPayloadInstance())
    return json({ report }, report.errors.length ? 207 : 200)
  } catch (error) { return json({ error: syncErrorMessage(error) }, 400) }
}
