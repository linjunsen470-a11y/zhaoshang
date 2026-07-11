import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { requireAuth } from '../../_shared/auth'
import { getPayloadInstance, json, mapMedia } from '../../_shared/payloadApi'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 12000
const ALLOWED_FORMATS = new Map([
  ['jpeg', { mime: 'image/jpeg', extension: 'jpg' }],
  ['png', { mime: 'image/png', extension: 'png' }],
  ['webp', { mime: 'image/webp', extension: 'webp' }],
])

function uploadError(message: string, status: number) {
  return json({ error: message }, status)
}

export async function POST(request: Request) {
  let auth
  try {
    auth = requireAuth(request)
  } catch (err) {
    return uploadError(err instanceof Error ? err.message : '未登录或登录已过期', 401)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return uploadError('上传请求格式无效', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return uploadError('请选择要上传的图片', 400)
  }
  if (file.size <= 0) return uploadError('图片内容为空', 400)
  if (file.size > MAX_FILE_SIZE) return uploadError('图片不能超过 10MB', 413)

  const originalBuffer = Buffer.from(await file.arrayBuffer())
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(originalBuffer, { failOn: 'error' }).metadata()
  } catch {
    return uploadError('文件内容不是有效图片', 415)
  }

  const format = metadata.format || ''
  const allowed = ALLOWED_FORMATS.get(format)
  if (!allowed) return uploadError('仅支持 JPG、PNG 或 WebP 图片', 415)
  if (file.type && file.type !== allowed.mime) {
    return uploadError('图片内容与文件类型不一致', 415)
  }
  if (!metadata.width || !metadata.height) return uploadError('无法读取图片尺寸', 415)
  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    return uploadError('图片尺寸过大', 413)
  }

  let pipeline = sharp(originalBuffer, { failOn: 'error' })
    .rotate()
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })

  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true })
  if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9 })
  if (format === 'webp') pipeline = pipeline.webp({ quality: 82 })

  let output: Buffer
  try {
    output = await pipeline.toBuffer()
  } catch {
    return uploadError('图片处理失败', 422)
  }

  const safeName = `${randomUUID()}.${allowed.extension}`
  const payload = await getPayloadInstance()
  const media = await payload.create({
    collection: 'media',
    data: {
      alt: '用户上传的线索附件',
      source: 'lead_attachment',
      ownerOpenId: auth.openid,
      originalFilename: file.name.slice(0, 255),
      compressedSize: output.length,
    },
    file: {
      data: output,
      mimetype: allowed.mime,
      name: safeName,
      size: output.length,
    },
    overrideAccess: true,
  })

  return json(mapMedia(media), 201)
}
