'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

export type LeadFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

type LeadFormProps = {
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>
}

const initialState: LeadFormState = { status: 'idle', message: '' }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button className="web-primary-button" type="submit" disabled={pending}>
      {pending ? '正在提交…' : '提交需求'}
    </button>
  )
}

export function LeadForm({ action }: LeadFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="web-lead-form">
      <div className="web-form-grid">
        <label className="web-field">
          <span>称呼 <b aria-hidden="true">*</b></span>
          <input name="name" type="text" maxLength={20} autoComplete="name" placeholder="例如：李先生" required />
        </label>
        <label className="web-field">
          <span>联系电话 <b aria-hidden="true">*</b></span>
          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            autoComplete="tel"
            placeholder="请输入 11 位手机号"
            pattern="1[3-9][0-9]{9}"
            required
          />
        </label>
      </div>

      <label className="web-field">
        <span>需求类型</span>
        <select name="leadType" defaultValue="leasing" autoComplete="off">
          <option value="leasing">查找项目与铺位</option>
          <option value="transfer">委托店铺转让</option>
          <option value="equipment_sell">出售餐饮设备</option>
          <option value="equipment_buy">求购餐饮设备</option>
          <option value="brand_cooperation">品牌合作</option>
        </select>
      </label>

      <label className="web-field">
        <span>经营品类或设备名称</span>
        <input
          name="businessType"
          type="text"
          maxLength={100}
          autoComplete="off"
          placeholder="例如：轻食、咖啡或制冰机"
        />
      </label>

      <label className="web-field">
        <span>需求说明</span>
        <textarea
          name="remark"
          rows={5}
          maxLength={500}
          autoComplete="off"
          placeholder="请填写意向区域、预算或其他需要说明的信息"
        />
      </label>

      <label className="web-consent">
        <input name="privacyConsent" type="checkbox" required />
        <span>我同意将以上信息用于招商咨询、需求匹配和联系跟进。</span>
      </label>

      {state.message ? (
        <p className={`web-form-message web-form-message--${state.status}`} role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
