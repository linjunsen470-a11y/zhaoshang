import type { CollectionConfig } from 'payload'
import { ADMIN_GROUPS, BUSINESS_TYPE_OPTIONS } from './shared/fieldOptions'

export const MerchantProfiles: CollectionConfig = {
  slug: 'merchant-profiles',
  labels: {
    plural: '商户档案',
    singular: '商户档案',
  },
  admin: {
    group: ADMIN_GROUPS.customers,
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'preferredRegion', 'budgetRange', 'status'],
    description: '长期客户画像库。单次咨询请优先在「咨询线索」中处理；高意向客户可在此沉淀档案。',
    listSearchableFields: ['name', 'phone', 'preferredRegion'],
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: '商户姓名/称呼',
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: '联系电话',
        },
      ],
    },
    {
      name: 'businessTypes',
      type: 'select',
      hasMany: true,
      label: '主营品类/业态',
      options: BUSINESS_TYPE_OPTIONS,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'budgetRange',
          type: 'text',
          label: '预算范围',
        },
        {
          name: 'preferredRegion',
          type: 'text',
          label: '意向区域',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'acceptsTransfer',
          type: 'checkbox',
          defaultValue: false,
          label: '可接受店铺转让',
        },
        {
          name: 'needsEquipment',
          type: 'checkbox',
          defaultValue: false,
          label: '有设备采买需求',
        },
        {
          name: 'hasCampusExperience',
          type: 'checkbox',
          defaultValue: false,
          label: '有校园开店经验',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      label: '跟进状态',
      options: [
        { label: '活跃跟进', value: 'active' },
        { label: '已成交', value: 'closed' },
        { label: '暂缓跟进', value: 'paused' },
        { label: '无效客户', value: 'invalid' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '综合备注/背景说明',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}