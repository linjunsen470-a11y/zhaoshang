export class RequestInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'RequestInputError'
  }
}

/** Bound the actual body, including requests without Content-Length. */
export async function readRequestBytes(request: Request, maxBytes: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new RequestInputError('请求内容过大', 413)
  }
  const reader = request.body?.getReader()
  if (!reader) throw new RequestInputError('无效的 JSON 请求体')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new RequestInputError('请求内容过大', 413)
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  } catch (error) {
    if (error instanceof RequestInputError) throw error
    throw new RequestInputError('无效的 JSON 请求体')
  } finally {
    reader.releaseLock()
  }
}

export async function readJsonObject(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const body = await readRequestBytes(request, maxBytes)
  let input: unknown
  try { input = JSON.parse(body.toString('utf8')) } catch { throw new RequestInputError('无效的 JSON 请求体') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestInputError('请求体必须是 JSON 对象')
  return input as Record<string, unknown>
}

export function jsonInputError(error: unknown) {
  return Response.json(
    { error: error instanceof RequestInputError ? error.message : '无效的 JSON 请求体' },
    { status: error instanceof RequestInputError ? error.status : 400 },
  )
}
