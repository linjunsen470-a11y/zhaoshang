import type { CollectionConfig } from 'payload'

export const FollowRecords: CollectionConfig = {
  slug: 'follow-records',
  admin: {
    useAsTitle: 'content',
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
      label: '线索',
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: '跟进内容',
    },
    {
      name: 'nextFollowAt',
      type: 'date',
      label: '下次跟进时间',
    },
    {
      name: 'operatorName',
      type: 'text',
      label: '跟进人',
    },
  ],
  timestamps: true,
}
