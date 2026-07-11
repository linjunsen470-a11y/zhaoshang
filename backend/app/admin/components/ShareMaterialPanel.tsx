'use client'

import { useEffect, useState } from 'react'
import {
  buildShareMaterial,
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

  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl)
    }
  }, [posterUrl])

  // Reset poster when project changes
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
      setMessage('海报已生成，可下载或复制图片')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '海报生成失败（若封面跨域失败请确认媒体域名）')
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
        <button className="cms-button" type="button" onClick={() => void copy(material.path, '小程序路径已复制')}>
          复制路径
        </button>
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
          <p className="cms-snapshot__badge">一键分享</p>
          <h3>{project.title || '房源素材'}</h3>
          <p>复制路径/文案，或生成「底图 + 封面 + 文案」海报图，便于投放到微信。</p>
        </div>
      </header>

      <div className="cms-share__grid">
        <label>
          <span>小程序路径</span>
          <input readOnly value={material.path} onFocus={event => event.currentTarget.select()} />
        </label>
        <label>
          <span>短标题</span>
          <input readOnly value={material.headline} onFocus={event => event.currentTarget.select()} />
        </label>
        <label className="cms-share__full">
          <span>完整文案</span>
          <textarea readOnly rows={6} value={material.copyText} onFocus={event => event.currentTarget.select()} />
        </label>
      </div>

      <div className="cms-row-actions">
        <button className="cms-button" type="button" onClick={() => void copy(material.path, '小程序路径已复制')}>
          复制路径
        </button>
        <button className="cms-button" type="button" onClick={() => void copy(material.headline, '标题已复制')}>
          复制标题
        </button>
        <button className="cms-button" type="button" onClick={() => void copy(material.copyText, '分享文案已复制')}>
          复制完整文案
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
          海报将嵌入房源封面图与标题/费用等信息。若封面未上传，将使用品牌底图占位。
          {project.coverImage ? '' : ' 当前房源暂无封面，建议先补图再生成。'}
        </p>
      )}

      <div className="cms-live" aria-live="polite">{message}</div>
    </section>
  )
}

export default ShareMaterialPanel
