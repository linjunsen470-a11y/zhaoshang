import type { CollectionConfig } from 'payload'
import { canManageLeads, isAdminUser } from './shared/access'
import {
  ADMIN_GROUPS,
  BUSINESS_SCENE_OPTIONS,
  EQUIPMENT_PUBLICATION_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_HELP,
} from './shared/fieldOptions'
import { buildLeadSnapshot } from '../lib/leadSnapshot'

const EQUIPMENT_TYPES = ['equipment_sell', 'equipment_buy', 'equipment_recycle']

const workingFields: CollectionConfig['fields'] = [
  { name: 'businessScene', type: 'select', label: '意向场景', options: BUSINESS_SCENE_OPTIONS },
  {
    type: 'row',
    fields: [
      { name: 'name', type: 'text', label: '客户称呼' },
      { name: 'phone', type: 'text', required: true, label: '联系电话' },
    ],
  },
  {
    type: 'row',
    fields: [
      {
        name: 'leadType',
        type: 'select',
        required: true,
        defaultValue: 'leasing',
        label: '咨询类型',
        options: [
          { label: '找铺咨询', value: 'leasing' },
          { label: '店铺转让', value: 'transfer' },
          { label: '出售设备', value: 'equipment_sell' },
          { label: '求购设备', value: 'equipment_buy' },
          { label: '回收咨询', value: 'equipment_recycle' },
          { label: '品牌合作', value: 'brand_cooperation' },
          { label: '装修咨询', value: 'renovation_consult' },
        ],
      },
      {
        name: 'sourceChannel',
        type: 'select',
        defaultValue: 'mini_program',
        label: '来源',
        options: [
          { label: '小程序', value: 'mini_program' },
          { label: '网站', value: 'website' },
          { label: '后台录入', value: 'admin' },
        ],
      },
    ],
  },
  {
    type: 'row',
    fields: [
      { name: 'businessType', type: 'text', label: '经营品类/设备名称' },
      { name: 'budgetRange', type: 'text', label: '预算/期望价格' },
      { name: 'regionPreference', type: 'text', label: '意向区域' },
    ],
  },
  { name: 'hasCampusExperience', type: 'checkbox', label: '有校园经营经验', admin: { condition: data => data?.businessScene === 'campus' } },
  { name: 'attachments', type: 'upload', relationTo: 'media', hasMany: true, label: '用户上传图片/附件' },
  {
    name: 'transferDetails',
    type: 'group',
    label: '店铺转让资料',
    admin: { condition: (_, siblingData) => siblingData?.leadType === 'transfer' },
    fields: [
      { name: 'locationText', type: 'text', label: '店铺位置' },
      { name: 'feeText', type: 'text', label: '面积与费用' },
      { name: 'transferFee', type: 'text', label: '转让费预期' },
      { name: 'remainingTerm', type: 'text', label: '剩余合同期' },
      { name: 'includesEquipment', type: 'checkbox', label: '是否包含设备' },
    ],
  },
  {
    name: 'equipmentDetails',
    type: 'group',
    label: '设备供需资料',
    admin: { condition: (_, siblingData) => EQUIPMENT_TYPES.includes(siblingData?.leadType) },
    fields: [
      { name: 'equipmentName', type: 'text', label: '设备名称' },
      { name: 'specText', type: 'text', label: '数量/规格' },
      { name: 'equipmentCondition', type: 'text', label: '成色/说明' },
      { name: 'expectedPrice', type: 'text', label: '预算/期望价格' },
    ],
  },
  {
    name: 'equipmentPublication',
    type: 'group',
    label: '设备公开设置',
    admin: {
      condition: (_, siblingData) => EQUIPMENT_TYPES.includes(siblingData?.leadType),
      description: '仅控制小程序设备列表是否展示，与咨询的“处理状态”无关。选择“已发布”并保存后才会公开；请先核实图片和说明。',
    },
    fields: [
      {
        name: 'status',
        type: 'select',
        defaultValue: 'draft',
        required: true,
        label: '设备发布状态',
        options: [...EQUIPMENT_PUBLICATION_OPTIONS],
      },
      { name: 'publicRemark', type: 'textarea', label: '公开说明' },
    ],
  },
  {
    name: 'renovationDetails',
    type: 'group',
    label: '装修咨询资料',
    admin: { condition: (_, siblingData) => siblingData?.leadType === 'renovation_consult' },
    fields: [
      { name: 'shopArea', type: 'text', label: '店铺面积' },
      {
        name: 'renovationType',
        type: 'select',
        label: '装修类型',
        options: [
          { label: '新铺装修', value: 'new_build' },
          { label: '旧铺翻新', value: 'renovation' },
          { label: '局部改造', value: 'partial' },
        ],
      },
      { name: 'designStyle', type: 'text', label: '设计风格偏好' },
      { name: 'budgetText', type: 'text', label: '装修预算' },
      { name: 'expectedStartDate', type: 'text', label: '预期开工时间' },
    ],
  },
  { name: 'remark', type: 'textarea', label: '用户补充说明（可改）' },
  {
    name: 'project',
    type: 'relationship',
    relationTo: 'projects',
    label: '关联房源',
  },
  {
    name: 'generatedProject',
    type: 'relationship',
    relationTo: 'projects',
    label: '已生成房源',
    admin: {
      readOnly: true,
      condition: data => data?.leadType === 'transfer',
    },
  },
]

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    plural: '咨询收件箱',
    singular: '咨询',
  },
  admin: {
    // Visible so document routes work. List UX is /admin/workspace/inquiries.
    group: ADMIN_GROUPS.inquiries,
    useAsTitle: 'name',
    defaultColumns: ['status', 'name', 'phone', 'leadType', 'projectTitle', 'createdAt'],
    description: '先看客户原文，联系后在右侧更新处理状态并保存。需要修正资料时再打开「处理编辑」。',
    listSearchableFields: ['name', 'phone', 'businessType', 'regionPreference', 'projectTitle'],
  },
  access: {
    read: ({ req: { user } }) => canManageLeads(user),
    create: ({ req: { user } }) => canManageLeads(user),
    update: ({ req: { user } }) => canManageLeads(user),
    delete: ({ req: { user } }) => isAdminUser(user),
  },
  fields: [
    { name: 'seedKey', type: 'text', unique: true, admin: { hidden: true } },
    { name: 'projectTitle', type: 'text', label: '关联房源标题', admin: { hidden: true, readOnly: true } },
    {
      name: 'submitterOpenId',
      type: 'text',
      label: '提交用户 OpenID',
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'contactBar',
      type: 'ui',
      label: '联系客户',
      admin: {
        components: { Field: '@/app/admin/components/InquiryContactBar' },
      },
    },
    {
      name: 'status', type: 'select', label: '咨询处理状态',
      options: [...LEAD_STATUS_OPTIONS], defaultValue: 'new', required: true,
      admin: { position: 'sidebar', description: LEAD_STATUS_HELP },
    },
    {
      name: 'internalNote', type: 'textarea', label: '内部跟进备注',
      admin: { position: 'sidebar', description: '记下沟通结果或下次跟进事项。仅后台可见；修改后点击保存。' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: '客户原文',
          description: '首次提交的原始记录，只读。处理状态和内部备注在右侧修改。',
          fields: [
            {
              name: 'customerSnapshot',
              type: 'json',
              label: '客户原文快照',
              admin: {
                readOnly: true,
                components: {
                  Field: '@/app/admin/components/CustomerSnapshotField',
                },
              },
            },
          ],
        },
        {
          label: '处理编辑',
          description: '需要修正联系方式、需求或设置设备公开时使用。这里的修改会更新咨询记录，但不会覆盖首次客户原文。',
          fields: workingFields,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (data.projectId && !data.project) data.project = data.projectId

        const projectChanged = operation === 'create'
          ? Boolean(data.project)
          : data.project !== undefined && data.project !== originalDoc?.project

        if (projectChanged) {
          if (data.project) {
            const project = await req.payload.findByID({ collection: 'projects', id: data.project })
            data.projectTitle = project?.title || ''
          } else {
            data.projectTitle = ''
          }
        }

        // Freeze customer original on first write; never allow overwrite afterwards.
        if (operation === 'create') {
          data.customerSnapshot = buildLeadSnapshot(data as Record<string, unknown>)
        } else if (operation === 'update') {
          data.customerSnapshot = originalDoc?.customerSnapshot
        }

        return data
      },
    ],
  },
  timestamps: true,
}
