'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildShareMaterial,
  renderMockQrDataUrl,
  renderSharePoster,
  type ShareableProject,
} from '@/lib/shareMaterials'

type Props = {
  project: ShareableProject
  compact?: boolean
}

export function ShareMaterialPanel({ project, compact }: Props) {
  const material = buildShareMaterial(project)
  const [message, setMessage] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [posterBusy, setPosterBusy] = useState(false)

  const mockQr = useMemo(
    () => renderMockQrDataUrl(`project:${project.id}`, 168),
    [project.id],
  )

  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl)
    }
  }, [posterUrl])

  useEffect(() => {
    setPosterUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setMessage('')
  }, [project.id, project.coverImage, project.title])

  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage(ok)
      window.setTimeout(() => setMessage(''), 2200)
    } catch {
      setMessage('复制失败，请手动选择文本')
    }
  }

  const generatePoster = async () => {
    setPosterBusy(true)
    setMessage('')
    try {
      const blob = await renderSharePoster(project)
      const url = URL.createObjectURL(blob)
      setPosterUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setMessage('海报已生成，可下载或复制图片到微信')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '海报生成失败（封面跨域时请确认媒体可访问）')
    } finally {
      setPosterBusy(false)
    }
  }

  const downloadPoster = () => {
    if (!posterUrl) return
    const a = document.createElement('a')
    a.href = posterUrl
    a.download = `校园商铺-${String(project.title || project.id).slice(0, 24)}.png`
    a.click()
    setMessage('海报已开始下载')
  }

  const copyPosterImage = async () => {
    if (!posterUrl) {
      setMessage('请先生成海报')
      return
    }
    try {
      const blob = await fetch(posterUrl).then(r => r.blob())
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        setMessage('当前浏览器不支持复制图片，请改用下载')
        return
      }
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setMessage('海报图片已复制，可粘贴到微信')
    } catch {
      setMessage('复制图片失败，请改用下载后发送')
    }
  }

  if (compact) {
    return (
      <div className="cms-share cms-share--compact">
        <button className="cms-button" type="button" onClick={() => void copy(material.copyText, '分享文案已复制')}>
          复制文案
        </button>
        <button className="cms-button cms-button--primary" type="button" disabled={posterBusy} onClick={() => void generatePoster()}>
          {posterBusy ? '生成中…' : '生成海报'}
        </button>
        {posterUrl ? (
          <>
            <button className="cms-button" type="button" onClick={downloadPoster}>下载海报</button>
            <button className="cms-button" type="button" onClick={() => void copyPosterImage()}>复制图片</button>
          </>
        ) : null}
        <div className="cms-live" aria-live="polite">{message}</div>
      </div>
    )
  }

  return (
    <section className="cms-share" aria-label="分享素材">
      <header className="cms-share__header">
        <div>
          <p className="cms-snapshot__badge">朋友圈 / 社群投放</p>
          <h3>{project.title || '房源素材'}</h3>
          <p>用户通过<strong>扫小程序码</strong>进入详情；开发阶段以下为示意码，正式上线后替换为微信小程序码。</p>
        </div>
      </header>

      <div className="cms-share__layout">
        <div className="cms-share__qr-card">
          {mockQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mockQr} alt="小程序示意码" width={168} height={168} />
          ) : null}
          <strong>扫码看房源</strong>
          <small>示意码 · 未正式上线</small>
          <span className="cms-share__path-ref">内部页：{material.path}</span>
        </div>

        <div className="cms-share__grid cms-share__grid--solo">
          <label>
            <span>分享标题</span>
            <input readOnly value={material.headline} onFocus={event => event.currentTarget.select()} />
          </label>
          <label className="cms-share__full">
            <span>分享文案（配合海报发送）</span>
            <textarea readOnly rows={7} value={material.copyText} onFocus={event => event.currentTarget.select()} />
          </label>
        </div>
      </div>

      <div className="cms-row-actions">
        <button className="cms-button" type="button" onClick={() => void copy(material.headline, '标题已复制')}>
          复制标题
        </button>
        <button className="cms-button" type="button" onClick={() => void copy(material.copyText, '分享文案已复制')}>
          复制文案
        </button>
        <button className="cms-button cms-button--primary" type="button" disabled={posterBusy} onClick={() => void generatePoster()}>
          {posterBusy ? '海报生成中…' : '生成分享海报'}
        </button>
        {posterUrl ? (
          <>
            <button className="cms-button" type="button" onClick={downloadPoster}>下载 PNG</button>
            <button className="cms-button" type="button" onClick={() => void copyPosterImage()}>复制图片</button>
          </>
        ) : null}
      </div>

      {posterUrl ? (
        <div className="cms-share__poster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterUrl} alt="分享海报预览" />
        </div>
      ) : (
        <p className="cms-help">
          海报含房源首图、关键信息与示意小程序码，适合发朋友圈。
          {project.coverImage ? '' : ' 当前无封面，建议先上传房源首图。'}
        </p>
      )}

      <div className="cms-live" aria-live="polite">{message}</div>
    </section>
  )
}

export default ShareMaterialPanel
