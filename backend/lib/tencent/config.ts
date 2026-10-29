import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export type SyncConfig = {
  endpoint: string
  token: string
  transport: 'http' | 'sse'
  fileId: string
  propertySheetId: string
  leadSheetId: string
  sourceKey: string
  intervalMinutes: number
  sourceRevision?: string
  enabled: boolean
  importProperties: boolean
  exportLeads: boolean
}

export function syncDirectory() {
  // Runtime state is created on the host, never bundled into the deployment.
  return path.resolve(/* turbopackIgnore: true */ process.env.TENCENT_SYNC_DIR || path.join(process.cwd(), '.tencent-sync'))
}

export async function readSyncFile<T>(name: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ syncDirectory(), name), 'utf8')) as T }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error }
}

export async function writeSyncFile(name: string, data: unknown) {
  const directory = syncDirectory()
  await mkdir(directory, { recursive: true })
  const temporary = path.join(directory, `${name}.${randomUUID()}.tmp`)
  await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 })
  await rename(temporary, path.join(/* turbopackIgnore: true */ directory, name))
}

export async function getSyncConfig(): Promise<SyncConfig> {
  const stored = await readSyncFile<Partial<SyncConfig>>('config.json', {})
  return {
    sourceRevision: stored.sourceRevision || 'initial',
    endpoint: process.env.TENCENT_DOCS_MCP_URL || stored.endpoint || '',
    token: process.env.TENCENT_DOCS_MCP_TOKEN || stored.token || '',
    transport: stored.transport || 'http',
    fileId: stored.fileId || 'NFVwfGTkzTfI',
    propertySheetId: stored.propertySheetId || 'tbIrk4',
    leadSheetId: stored.leadSheetId || '8fAWWA',
    sourceKey: stored.sourceKey || 'zhaoshang-demo',
    intervalMinutes: stored.intervalMinutes || 30,
    enabled: stored.enabled ?? false,
    importProperties: stored.importProperties ?? true,
    exportLeads: stored.exportLeads ?? true,
  }
}

export function publicSyncConfig(config: SyncConfig) {
  // The endpoint may contain a token in its query/path. Never return it to a browser.
  const { endpoint, token, ...settings } = config
  return { ...settings, connected: Boolean(endpoint), endpointHost: endpoint ? new URL(endpoint).host : '', hasToken: Boolean(token) }
}

export async function saveSyncConfig(input: Record<string, unknown>) {
  const current = await getSyncConfig()
  const next = { ...current }
  if (typeof input.endpoint === 'string' && input.endpoint.trim()) {
    const endpoint = new URL(input.endpoint.trim())
    if (endpoint.username || endpoint.password || !['https:', 'http:'].includes(endpoint.protocol)
      || (endpoint.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) {
      throw new Error('MCP 地址需要 HTTPS；本机调试可使用 HTTP localhost')
    }
    next.endpoint = endpoint.toString()
  }
  if (input.clearToken === true) next.token = ''
  else if (typeof input.token === 'string' && input.token.trim()) next.token = input.token.trim()
  for (const key of ['fileId', 'propertySheetId', 'leadSheetId', 'sourceKey'] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input[key])) throw new Error(`${key} 格式无效`)
      next[key] = input[key]
    }
  }
  for (const key of ['enabled', 'importProperties', 'exportLeads'] as const) {
    if (typeof input[key] === 'boolean') next[key] = input[key]
  }
  if (input.transport === 'http' || input.transport === 'sse') next.transport = input.transport
  if (input.intervalMinutes !== undefined) {
    const minutes = Number(input.intervalMinutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('同步周期应为 1—1440 分钟')
    next.intervalMinutes = minutes
  }
  if (next.enabled && !next.endpoint) throw new Error('先填写 MCP 连接地址，再启用定时同步')
  if (next.fileId !== current.fileId || next.propertySheetId !== current.propertySheetId) next.sourceRevision = randomUUID()
  await writeSyncFile('config.json', next)
  return publicSyncConfig(next)
}

export function syncErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : '同步失败')
    .replace(/https?:\/\/[^\s)]+/g, '[服务地址]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [已隐藏]')
    .slice(0, 300)
}
