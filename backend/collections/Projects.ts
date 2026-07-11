import type { CollectionConfig, Where } from 'payload'
import { canManageProjects, isAdminUser, isStaffUser } from './shared/access'
import {
  BUSINESS_TYPE_OPTIONS,
  CITY_OPTIONS,
  DISTRICT_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from './shared/fieldOptions'
import { getProjectMissingFields } from '../lib/cmsRules.mjs'

export { getProjectMissingFields } from '../lib/cmsRules.mjs'

export const PUBLIC_PROJECT_STATUSES = ['online', 'coming', 'full'] as const

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    plural: '房源管理',
    singular: '房源',
  },
  admin: {
    hidden: true,
    useAsTitle: 'title',
    defaultColumns: ['title', 'opportunityType', 'status', 'district', 'feeText', 'isRecommended', 'updatedAt'],
    description: '整理、修改并上下架小程序中的校园商铺房源。',
    listSearchableFields: ['title', 'schoolName', 'schoolAlias', 'district', 'addressText'],
    components: {
      views: {
        list: {
          Component: '@/app/admin/components/PropertyWorkspace',
        },
      },
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && isStaffUser(user)) return true
      return { status: { in: [...PUBLIC_PROJECT_STATUSES] } } as Where
    },
    create: ({ req: { user } }) => canManageProjects(user),
    update: ({ req: { user } }) => canManageProjects(user),
    delete: ({ req: { user } }) => isAdminUser(user),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const merged = { ...(originalDoc || {}), ...(data || {}) } as Record<string, unknown>
        if (PUBLIC_PROJECT_STATUSES.includes(merged.status as (typeof PUBLIC_PROJECT_STATUSES)[number])) {
          const missing = getProjectMissingFields(merged)
          if (missing.length) {
            throw new Error(`房源暂不能上架，请补充：${missing.join('、')}`)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'seedKey',
      type: 'text',
      unique: true,
      admin: { hidden: true },
    },
    {
      type: 'collapsible',
      label: '上架必填信息',
      admin: {
        initCollapsed: false,
        description: '完成以下信息后即可直接上架，无需额外审核。',
      },
      fields: [
        {
          name: 'coverImage',
          type: 'upload',
          relationTo: 'media',
          label: '封面图',
          required: true,
          admin: { description: '建议使用 4:3 或 16:9 横图。' },
        },
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true, label: '房源标题' },
            {
              name: 'opportunityType',
              type: 'select',
              required: true,
              defaultValue: 'leasing',
              label: '房源业务类型',
              options: [
                { label: '招商铺位', value: 'leasing' },
                { label: '店铺转让', value: 'transfer' },
              ],
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'city', type: 'select', label: '城市', defaultValue: '广州', options: CITY_OPTIONS },
            { name: 'district', type: 'select', required: true, label: '区域/区县', options: DISTRICT_OPTIONS },
            {
              name: 'projectType',
              type: 'select',
              required: true,
              label: '房源类型',
              options: PROJECT_TYPE_OPTIONS,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'schoolName', type: 'text', label: '学校名称' },
            { name: 'schoolAlias', type: 'text', label: '学校简称' },
            { name: 'showFullSchoolName', type: 'checkbox', defaultValue: false, label: '显示完整学校名' },
          ],
        },
        {
          name: 'addressText',
          type: 'text',
          label: '详细地址',
          admin: { placeholder: '例如：第一食堂二楼 A05 档口…' },
        },
        {
          type: 'row',
          fields: [
            { name: 'areaText', type: 'text', label: '面积', admin: { placeholder: '例如：15m²…' } },
            {
              name: 'feeText',
              type: 'text',
              required: true,
              label: '费用说明',
              admin: { placeholder: '例如：3 万元/年，另收 2% 管理费…' },
            },
          ],
        },
        {
          name: 'customerInfo',
          type: 'textarea',
          required: true,
          label: '客群说明',
          admin: { description: '说明校园规模、主要客群和消费时段。' },
        },
        {
          name: 'images',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          minRows: 1,
          label: '详情轮播图',
          admin: { description: '至少上传 1 张实景图。' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: '展示增强信息',
      admin: { initCollapsed: false },
      fields: [
        { name: 'suitableBusiness', type: 'select', hasMany: true, label: '适合业态', options: BUSINESS_TYPE_OPTIONS },
        { name: 'unsuitableBusiness', type: 'select', hasMany: true, label: '不适合业态', options: BUSINESS_TYPE_OPTIONS },
        {
          name: 'highlights',
          type: 'text',
          hasMany: true,
          label: '房源亮点',
          admin: { description: '每输入一条按回车继续添加。' },
        },
        { name: 'cooperationMode', type: 'textarea', label: '合作方式' },
        { name: 'viewingTimeText', type: 'textarea', label: '看铺安排' },
      ],
    },
    {
      type: 'collapsible',
      label: '转让专属信息',
      admin: {
        initCollapsed: false,
        condition: data => data?.opportunityType === 'transfer',
      },
      fields: [
        {
          name: 'transferInfo',
          type: 'group',
          label: false,
          fields: [
            { name: 'currentBusiness', type: 'text', label: '当前业态' },
            { name: 'monthlyRent', type: 'text', label: '月租/管理费' },
            { name: 'remainingTerm', type: 'text', label: '剩余合同期' },
            { name: 'includesEquipment', type: 'checkbox', label: '是否含设备' },
            { name: 'expectedTransferFee', type: 'text', label: '转让费预期' },
            { name: 'contractTransferAllowed', type: 'text', label: '合同是否允许转让' },
          ],
        },
      ],
    },
    {
      name: 'sourceLead',
      type: 'relationship',
      relationTo: 'leads',
      label: '来源咨询',
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'sourceLeadKey',
      type: 'text',
      unique: true,
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'miniProgramPreview',
      type: 'ui',
      label: '发布操作',
      admin: {
        position: 'sidebar',
        components: { Field: '@/app/admin/components/ProjectEditHints' },
      },
    },
    {
      name: 'status',
      type: 'select',
      label: '房源状态',
      options: [...PROPERTY_STATUS_OPTIONS],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
        description: '开放中、即将开放和已满/已转会在小程序中展示。',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      defaultValue: false,
      label: '重点推荐',
      admin: { position: 'sidebar' },
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
      label: '排序权重',
      admin: {
        position: 'sidebar',
        description: '数值越大越靠前。',
      },
    },
    {
      name: 'remark',
      type: 'textarea',
      label: '内部备注',
      admin: {
        position: 'sidebar',
        description: '仅后台可见。',
      },
    },
  ],
  timestamps: true,
}
