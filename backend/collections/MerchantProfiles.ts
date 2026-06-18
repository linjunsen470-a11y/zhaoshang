import type { CollectionConfig } from 'payload'

export const MerchantProfiles: CollectionConfig = {
  slug: 'merchant-profiles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'preferredRegion', 'budgetRange', 'status'],
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'businessTypes', type: 'array', fields: [{ name: 'item', type: 'text' }] },
    { name: 'budgetRange', type: 'text' },
    { name: 'preferredRegion', type: 'text' },
    { name: 'acceptsTransfer', type: 'checkbox', defaultValue: false },
    { name: 'needsEquipment', type: 'checkbox', defaultValue: false },
    { name: 'hasCampusExperience', type: 'checkbox', defaultValue: false },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: '活跃跟进', value: 'active' },
        { label: '已成交', value: 'closed' },
        { label: '暂缓', value: 'paused' },
        { label: '无效', value: 'invalid' },
      ],
    },
    { name: 'notes', type: 'textarea' },
  ],
  timestamps: true,
}
