'use client'

import { useField } from '@payloadcms/ui'
import {
  LEAD_TYPE_LABELS,
  categoryForLeadType,
} from '@/collections/shared/fieldOptions'
import type { LeadSnapshot } from '@/lib/leadSnapshot'
import { isLeadSnapshot } from '@/lib/leadSnapshot'

const SOURCE_LABELS: Record<string, string> = {
  mini_program: '小程序',
  website: '网站',
  admin: '后台录入',
}

const RENOVATION_TYPE_LABELS: Record<string, string> = {
  new_build: '新铺装修',
  renovation: '旧铺翻新',
  partial: '局部改造',
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="cms-snapshot__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatCapturedAt(value?: string) {
  if (!value) return ''
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(time)
}

export function CustomerSnapshotField() {
  const { value } = useField<LeadSnapshot | null>({ path: 'customerSnapshot' })
  const snapshot = isLeadSnapshot(value) ? value : null

  if (!snapshot) {
    return (
      <div className="cms-snapshot cms-snapshot--empty">
        <p className="cms-snapshot__badge">客户原文 · 锁定</p>
        <p>暂无锁定的客户原文。保存本条咨询后，将按当前内容生成一次快照；此后原文不可被覆盖。</p>
      </div>
    )
  }

  const typeLabel = LEAD_TYPE_LABELS[snapshot.leadType || ''] || snapshot.leadType || '—'
  const category = categoryForLeadType(snapshot.leadType)
  const categoryLabel = category === 'property' ? '房源咨询' : category === 'equipment' ? '设备咨询' : category === 'renovation' ? '装修咨询' : ''
  const transfer = snapshot.transferDetails || {}
  const equipment = snapshot.equipmentDetails || {}
  const renovation = snapshot.renovationDetails || {}

  return (
    <div className="cms-snapshot">
      <header className="cms-snapshot__header">
        <div>
          <p className="cms-snapshot__badge">客户原文 · 不可修改</p>
          <h3>首次提交快照</h3>
          <p>以下为客户最初提交内容，仅供对照。后台请在「处理编辑」页签修改工作副本。</p>
        </div>
        <time dateTime={snapshot.capturedAt}>锁定于 {formatCapturedAt(snapshot.capturedAt)}</time>
      </header>

      <dl className="cms-snapshot__grid">
        <Row label="客户称呼" value={snapshot.name} />
        <Row label="联系电话" value={snapshot.phone} />
        <Row label="业务分类" value={categoryLabel} />
        <Row label="咨询类型" value={typeLabel} />
        <Row label="来源" value={SOURCE_LABELS[snapshot.sourceChannel || ''] || snapshot.sourceChannel} />
        <Row label="经营品类/设备" value={snapshot.businessType} />
        <Row label="预算/期望价格" value={snapshot.budgetRange} />
        <Row label="意向区域" value={snapshot.regionPreference} />
        <Row label="校园经营经验" value={snapshot.hasCampusExperience ? '有' : '未勾选'} />
        <Row label="关联房源 ID" value={snapshot.projectId != null ? String(snapshot.projectId) : ''} />
        <Row label="用户补充说明" value={snapshot.remark} />
        <Row label="附件数量" value={snapshot.attachmentIds?.length ? `${snapshot.attachmentIds.length} 个` : '无'} />
      </dl>

      {snapshot.leadType === 'transfer' && Object.keys(transfer).length > 0 ? (
        <section className="cms-snapshot__section">
          <h4>店铺转让资料</h4>
          <dl className="cms-snapshot__grid">
            <Row label="店铺位置" value={String(transfer.locationText || '')} />
            <Row label="面积与费用" value={String(transfer.feeText || '')} />
            <Row label="转让费预期" value={String(transfer.transferFee || '')} />
            <Row label="剩余合同期" value={String(transfer.remainingTerm || '')} />
            <Row label="包含设备" value={transfer.includesEquipment ? '是' : '否'} />
          </dl>
        </section>
      ) : null}

      {['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(String(snapshot.leadType)) && Object.keys(equipment).length > 0 ? (
        <section className="cms-snapshot__section">
          <h4>设备供需资料</h4>
          <dl className="cms-snapshot__grid">
            <Row label="设备名称" value={String(equipment.equipmentName || '')} />
            <Row label="数量/规格" value={String(equipment.specText || '')} />
            <Row label="成色/说明" value={String(equipment.equipmentCondition || '')} />
            <Row label="预算/期望价格" value={String(equipment.expectedPrice || '')} />
          </dl>
        </section>
      ) : null}

      {snapshot.leadType === 'renovation_consult' && Object.keys(renovation).length > 0 ? (
        <section className="cms-snapshot__section">
          <h4>装修咨询资料</h4>
          <dl className="cms-snapshot__grid">
            <Row label="店铺面积" value={String(renovation.shopArea || '')} />
            <Row
              label="装修类型"
              value={RENOVATION_TYPE_LABELS[String(renovation.renovationType || '')] || String(renovation.renovationType || '')}
            />
            <Row label="设计风格" value={String(renovation.designStyle || '')} />
            <Row label="装修预算" value={String(renovation.budgetText || '')} />
            <Row label="预期开工" value={String(renovation.expectedStartDate || '')} />
          </dl>
        </section>
      ) : null}
    </div>
  )
}

export default CustomerSnapshotField
