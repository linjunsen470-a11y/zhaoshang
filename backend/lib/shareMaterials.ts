/** Mini-program share copy + poster helpers for staff CMS. */

export type ShareableProject = {
  id: string | number
  title?: string | null
  schoolName?: string | null
  schoolAlias?: string | null
  district?: string | null
  areaText?: string | null
  feeText?: string | null
  projectType?: string | null
  opportunityType?: string | null
  status?: string | null
  coverImage?: string | null
}

/** Internal page path (for staff reference / future wxacode API). Not a clickable web URL. */
export function miniProgramDetailPath(projectId: string | number) {
  return `pages/detail/detail?id=${projectId}`
}

export function buildShareMaterial(project: ShareableProject) {
  const id = String(project.id)
  const title = (project.title || '校园商铺').trim()
  const school = (project.schoolName || project.schoolAlias || '').trim()
  const district = (project.district || '').trim()
  const area = (project.areaText || '').trim()
  const fee = (project.feeText || '').trim()
  const type = project.opportunityType === 'transfer' ? '店铺转让' : '招商铺位'
  const path = miniProgramDetailPath(id)

  const lines = [
    `【${type}】${title}`,
    school ? `学校：${school}` : '',
    district ? `区域：${district}` : '',
    area ? `面积：${area}` : '',
    fee ? `费用：${fee}` : '',
    '',
    '长按识别海报中的小程序码，即可查看详情并提交咨询。',
    '（开发阶段为示意码，正式上线后替换为微信小程序码）',
  ]

  return {
    path,
    headline: title,
    copyText: lines.filter(Boolean).join('\n'),
    shortText: [title, school || district, fee].filter(Boolean).join(' · '),
    typeLabel: type,
    coverImage: project.coverImage || '',
    scanHint: '微信扫码看房源',
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const chars = [...text]
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && chars.join('').length > lines.join('').length) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`
  }
  return lines
}

/** Deterministic pseudo-QR pattern for pre-launch mock (not a real WeChat code). */
function drawMockQrCode(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: string) {
  const modules = 25
  const cell = size / modules
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0

  const bit = (row: number, col: number) => {
    // Finder patterns (top-left, top-right, bottom-left)
    const inFinder = (r: number, c: number, fr: number, fc: number) => {
      const dr = r - fr
      const dc = c - fc
      if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true
      if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true
      return false
    }
    const f1 = inFinder(row, col, 0, 0)
    if (f1 !== null) return f1
    const f2 = inFinder(row, col, 0, modules - 7)
    if (f2 !== null) return f2
    const f3 = inFinder(row, col, modules - 7, 0)
    if (f3 !== null) return f3
    // Timing patterns
    if (row === 6 || col === 6) return (row + col) % 2 === 0
    const n = (hash ^ (row * 73856093) ^ (col * 19349663)) >>> 0
    return (n % 3) !== 0
  }

  // White quiet zone background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x - 8, y - 8, size + 16, size + 16)

  ctx.fillStyle = '#0f172a'
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (bit(row, col)) {
        ctx.fillRect(x + col * cell, y + row * cell, Math.ceil(cell), Math.ceil(cell))
      }
    }
  }
}

/**
 * Clean listing-style poster: soft paper bg, hero photo, meta, mock mini-program QR.
 */
export async function renderSharePoster(project: ShareableProject): Promise<Blob> {
  const material = buildShareMaterial(project)
  const width = 750
  const height = 1200
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  // Soft paper background
  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(0, 0, width, height)

  // Subtle top brand strip
  ctx.fillStyle = '#172033'
  ctx.fillRect(0, 0, width, 88)
  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 28px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  ctx.fillText('校园商铺', 40, 56)
  ctx.font = '500 20px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(248,250,252,0.72)'
  ctx.fillText(material.typeLabel, width - 40 - ctx.measureText(material.typeLabel).width, 56)

  // Hero photo
  const photoX = 40
  const photoY = 120
  const photoW = width - 80
  const photoH = 520
  ctx.save()
  roundRect(ctx, photoX, photoY, photoW, photoH, 20)
  ctx.clip()
  ctx.fillStyle = '#dbe3ee'
  ctx.fillRect(photoX, photoY, photoW, photoH)

  if (material.coverImage) {
    try {
      const img = await loadImage(material.coverImage)
      const scale = Math.max(photoW / img.width, photoH / img.height)
      const iw = img.width * scale
      const ih = img.height * scale
      ctx.drawImage(img, photoX + (photoW - iw) / 2, photoY + (photoH - ih) / 2, iw, ih)
    } catch {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '600 28px system-ui, sans-serif'
      ctx.fillText('封面加载失败', photoX + 40, photoY + photoH / 2)
    }
  } else {
    ctx.fillStyle = '#64748b'
    ctx.font = '600 28px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    ctx.fillText('暂无封面，建议先上传房源首图', photoX + 48, photoY + photoH / 2)
  }
  ctx.restore()

  // White content card
  const cardY = 668
  const cardH = 460
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 40, cardY, width - 80, cardH, 20)
  ctx.fill()
  ctx.strokeStyle = 'rgba(23,32,51,0.06)'
  ctx.lineWidth = 1
  roundRect(ctx, 40, cardY, width - 80, cardH, 20)
  ctx.stroke()

  // Title
  ctx.fillStyle = '#172033'
  ctx.font = '800 40px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  const titleLines = wrapText(ctx, material.headline, width - 280, 2)
  titleLines.forEach((line, index) => {
    ctx.fillText(line, 72, cardY + 64 + index * 48)
  })

  // Meta rows
  const metaY = cardY + 64 + titleLines.length * 48 + 28
  const meta = [
    { k: '学校', v: (project.schoolName || project.schoolAlias || '').trim() },
    { k: '区域', v: (project.district || '').trim() },
    { k: '面积', v: (project.areaText || '').trim() },
    { k: '费用', v: (project.feeText || '').trim() },
  ].filter(item => item.v)

  meta.forEach((item, index) => {
    const y = metaY + index * 42
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 22px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    ctx.fillText(item.k, 72, y)
    ctx.fillStyle = '#334155'
    ctx.font = '700 24px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    ctx.fillText(item.v, 150, y)
  })

  // Mock mini-program QR (bottom-right of card)
  const qrSize = 148
  const qrX = width - 72 - qrSize
  const qrY = cardY + cardH - 72 - qrSize - 28
  drawMockQrCode(ctx, qrX, qrY, qrSize, String(project.id))

  ctx.fillStyle = '#64748b'
  ctx.font = '600 18px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  const hint = material.scanHint
  const hintW = ctx.measureText(hint).width
  ctx.fillText(hint, qrX + (qrSize - hintW) / 2, qrY + qrSize + 28)

  // Dev badge under QR
  ctx.fillStyle = '#b45309'
  ctx.font = '600 16px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  const badge = '示意码 · 未上线'
  const badgeW = ctx.measureText(badge).width
  ctx.fillText(badge, qrX + (qrSize - badgeW) / 2, qrY + qrSize + 52)

  // Bottom footer
  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 18px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  ctx.fillText('校园商铺招商 · 扫码查看完整信息', 40, height - 28)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error('海报导出失败'))
      else resolve(blob)
    }, 'image/png')
  })
}

/** Standalone mock QR image for UI preview (same algorithm as poster). */
export function renderMockQrDataUrl(seed: string, size = 200): string {
  const canvas = document.createElement('canvas')
  const pad = 16
  canvas.width = size + pad * 2
  canvas.height = size + pad * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawMockQrCode(ctx, pad, pad, size, seed)
  return canvas.toDataURL('image/png')
}
