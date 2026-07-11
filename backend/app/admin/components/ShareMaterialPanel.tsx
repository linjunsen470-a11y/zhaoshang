'use client'

import { useState } from 'react'
import { buildShareMaterial, type ShareableProject } from '@/lib/shareMaterials'

type Props = {
  project: ShareableProject
  compact?: boolean
}

export function ShareMaterialPanel({ project, compact }: Props) {
  const material = buildShareMaterial(project)
  const [message, setMessage] = useState('')

  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage(ok)
      window.setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('复制失败，请手动选择文本')
    }
  }

  if (compact) {
    return (
      <div className="cms-share cms-share--compact">
        <button className="cms-button" type="button" onClick={() => void copy(material.path, '小程序路径已复制')}>
          复制路径
        </button>
        <button className="cms-button cms-button--primary" type="button" onClick={() => void copy(material.copyText, '分享文案已复制')}>
          复制文案
        </button>
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
          <p>复制路径或朋友圈/社群文案，投放到微信渠道。</p>
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
          <textarea readOnly rows={7} value={material.copyText} onFocus={event => event.currentTarget.select()} />
        </label>
      </div>
      <div className="cms-row-actions">
        <button className="cms-button" type="button" onClick={() => void copy(material.path, '小程序路径已复制')}>
          复制路径
        </button>
        <button className="cms-button" type="button" onClick={() => void copy(material.headline, '标题已复制')}>
          复制标题
        </button>
        <button className="cms-button cms-button--primary" type="button" onClick={() => void copy(material.copyText, '分享文案已复制')}>
          复制完整文案
        </button>
      </div>
      <p className="cms-help" style={{ marginTop: 12 }}>
        建议配房源封面图；路径需在已发布小程序中打开。封面请在房源编辑页上传 4:3 或 16:9 横图。
      </p>
      <div className="cms-live" aria-live="polite">{message}</div>
    </section>
  )
}

export default ShareMaterialPanel
