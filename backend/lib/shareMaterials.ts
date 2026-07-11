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

export function miniProgramDetailPath(projectId: string | number) {
  return `/pages/detail/detail?id=${projectId}`
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
    school ? `📍 学校：${school}` : '',
    district ? `🗺 区域：${district}` : '',
    area ? `📐 面积：${area}` : '',
    fee ? `💰 费用：${fee}` : '',
    '',
    '感兴趣可打开小程序查看详情或提交咨询。',
    `小程序路径：${path}`,
  ]

  return {
    path,
    headline: `【校园商铺】${title}`,
    copyText: lines.filter(Boolean).join('\n'),
    shortText: [title, school || district, fee].filter(Boolean).join(' · '),
    typeLabel: type,
    coverImage: project.coverImage || '',
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

/**
 * Compose a 3:4 poster: gradient base + cover photo + text card.
 * Returns a PNG blob suitable for download or clipboard.
 */
export async function renderSharePoster(project: ShareableProject): Promise<Blob> {
  const material = buildShareMaterial(project)
  const width = 750
  const height = 1000
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#0f2744')
  bg.addColorStop(0.45, '#1d4ed8')
  bg.addColorStop(1, '#0ea5e9')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Decorative circles
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.arc(620, 120, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(80, 860, 140, 0, Math.PI * 2)
  ctx.fill()

  // Brand chip
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  roundRect(ctx, 40, 40, 220, 44, 22)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 22px system-ui, sans-serif'
  ctx.fillText('校园商铺 · 精选', 62, 70)

  // Cover card
  const cardX = 40
  const cardY = 110
  const cardW = width - 80
  const cardH = 420
  ctx.save()
  roundRect(ctx, cardX, cardY, cardW, cardH, 28)
  ctx.clip()
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(cardX, cardY, cardW, cardH)

  if (material.coverImage) {
    try {
      const img = await loadImage(material.coverImage)
      const scale = Math.max(cardW / img.width, cardH / img.height)
      const iw = img.width * scale
      const ih = img.height * scale
      const ix = cardX + (cardW - iw) / 2
      const iy = cardY + (cardH - ih) / 2
      ctx.drawImage(img, ix, iy, iw, ih)
      // darken bottom of photo for readability if needed
      const fade = ctx.createLinearGradient(0, cardY + cardH * 0.55, 0, cardY + cardH)
      fade.addColorStop(0, 'rgba(15,23,42,0)')
      fade.addColorStop(1, 'rgba(15,23,42,0.35)')
      ctx.fillStyle = fade
      ctx.fillRect(cardX, cardY, cardW, cardH)
    } catch {
      ctx.fillStyle = '#334155'
      ctx.fillRect(cardX, cardY, cardW, cardH)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '600 28px system-ui, sans-serif'
      ctx.fillText('暂无封面图', cardX + 40, cardY + cardH / 2)
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillText('暂无封面图 · 请先在房源编辑页上传', cardX + 40, cardY + cardH / 2)
  }
  ctx.restore()

  // Type badge on photo
  ctx.fillStyle = '#1d4ed8'
  roundRect(ctx, cardX + 24, cardY + 24, 140, 40, 12)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 20px system-ui, sans-serif'
  ctx.fillText(material.typeLabel, cardX + 42, cardY + 51)

  // Info panel
  const panelY = 560
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  roundRect(ctx, 40, panelY, width - 80, 360, 28)
  ctx.fill()

  ctx.fillStyle = '#0f172a'
  ctx.font = '800 36px system-ui, sans-serif'
  const titleLines = wrapText(ctx, material.headline.replace(/^【校园商铺】/, ''), width - 160, 2)
  titleLines.forEach((line, index) => {
    ctx.fillText(line, 72, panelY + 56 + index * 44)
  })

  const metaStart = panelY + 56 + titleLines.length * 44 + 20
  ctx.fillStyle = '#475569'
  ctx.font = '600 24px system-ui, sans-serif'
  const meta = [
    project.schoolName || project.schoolAlias ? `学校  ${project.schoolName || project.schoolAlias}` : '',
    project.district ? `区域  ${project.district}` : '',
    project.areaText ? `面积  ${project.areaText}` : '',
    project.feeText ? `费用  ${project.feeText}` : '',
  ].filter(Boolean)

  meta.forEach((line, index) => {
    ctx.fillText(line, 72, metaStart + index * 36)
  })

  // Footer path hint
  ctx.fillStyle = '#1d4ed8'
  roundRect(ctx, 72, panelY + 280, width - 184, 48, 14)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 20px system-ui, sans-serif'
  const pathText = material.path.length > 34 ? `${material.path.slice(0, 34)}…` : material.path
  ctx.fillText(pathText, 92, panelY + 311)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error('海报导出失败'))
      else resolve(blob)
    }, 'image/png')
  })
}
