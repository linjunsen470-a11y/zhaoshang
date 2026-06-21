import type { CollectionConfig } from 'payload'
import { canManageMerchants, isAdminUser } from './shared/access'
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
    defaultColumns: ['name', 'phone', 'preferredRegion', 'budgetRange', 'status', 'updatedAt'],
    description: '长期客户画像库。可从咨询线索一键沉淀档案，并在此查看历史关联线索。',
    listSearchableFields: ['name', 'phone', 'preferredRegion'],
  },
  access: {
    read: ({ req: { user } }) => canManageMerchants(user),
    create: ({ req: { user } }) => canManageMerchants(user),
    update: ({ req: { user } }) => canManageMerchants(user),
    delete: ({ req: { user } }) => isAdminUser(user),
  },
  fields: [
    {
      name: 'relatedLeadsPanel',
      type: 'ui',
      label: '关联线索',
      admin: {
        components: {
          Field: '@/app/admin/components/MerchantProfileLeadsPanel',
        },
      },
    },
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
          unique: true,
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
      name: 'relatedLeads',
      type: 'relationship',
      relationTo: 'leads',
      hasMany: true,
      label: '关联咨询线索',
      admin: {
        description: '通常由「沉淀为商户档案」自动维护，也可手动补充关联。',
      },
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