'use client'

import { useState } from 'react'

export default function MiniProgramSearch() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle')

  async function copyName() {
    try {
      await navigator.clipboard.writeText('岭南旺铺')
      setStatus('copied')
    } catch {
      setStatus('manual')
    }
  }

  return (
    <div className="copy-control">
      <button type="button" onClick={copyName}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
          <rect x="7" y="7" width="10" height="11" rx="1.5" />
          <path d="M12.5 4.5v-1A1.5 1.5 0 0 0 11 2H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13h.5" />
        </svg>
        复制小程序名称
      </button>
      <span role="status" className="copy-status">
        {status === 'copied' && '已复制，可粘贴到微信搜索'}
        {status === 'manual' && (
          <label>选中后复制
            <input
              ref={element => { element?.focus() }}
              aria-label="小程序名称"
              readOnly value="岭南旺铺" onFocus={event => event.currentTarget.select()}
            />
          </label>
        )}
      </span>
    </div>
  )
}
