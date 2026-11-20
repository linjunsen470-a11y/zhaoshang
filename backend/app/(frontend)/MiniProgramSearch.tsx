'use client'

import { useState } from 'react'

const name = '岭南旺铺'

export default function MiniProgramSearch() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle')

  async function copyName() {
    try {
      await navigator.clipboard.writeText(name)
      setStatus('copied')
    } catch {
      setStatus('manual')
    }
  }

  return (
    <div className="search">
      <button type="button" onClick={copyName} aria-label="复制小程序名称：岭南旺铺">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
        <span>微信搜<strong>「{name}」</strong></span>
        <span aria-hidden="true" className="copy-label">{status === 'copied' ? '已复制' : '复制'}</span>
      </button>
      <span role="status" className="sr-only">{status === 'copied' && '已复制，可粘贴到微信搜索'}</span>
      {status === 'manual' && (
        <label className="manual-copy">选中后复制
          <input ref={element => { element?.focus() }} aria-label="小程序名称"
            readOnly value={name} onFocus={event => event.currentTarget.select()} />
        </label>
      )}
    </div>
  )
}
