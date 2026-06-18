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
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      required: true,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'nextFollowAt',
      type: 'date',
    },
    {
      name: 'operatorName',
      type: 'text',
    },
  ],
  timestamps: true,
}
