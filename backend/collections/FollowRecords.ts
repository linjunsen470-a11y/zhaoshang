import type { CollectionConfig } from 'payload'

export const FollowRecords: CollectionConfig = {
  slug: 'follow-records',
  labels: {
    plural: '跟进明细（归档）',
    singular: '跟进明细',
  },
  admin: {
    hidden: true,
    useAsTitle: 'operatorName',
    defaultColumns: ['lead', 'operatorName', 'createdAt'],
    description: '跟进记录请在线索详情的「跟进历史」标签页添加，此集合仅供系统归档查询。',
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'seedKey',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      required: true,
      label: '关联线索',
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: '跟进内容详情',
    },
    {
      name: 'nextFollowAt',
      type: 'date',
      label: '下次跟进时间',
    },
    {
      name: 'operatorName',
      type: 'text',
      label: '跟进人姓名',
    },
  ],
  timestamps: true,
}