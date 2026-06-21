import type { CollectionConfig } from 'payload'
import { ADMIN_GROUPS } from './shared/fieldOptions'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    plural: '管理员',
    singular: '管理员',
  },
  auth: true,
  admin: {
    group: ADMIN_GROUPS.system,
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'email', 'role'],
    description: '后台登录账号。displayName 会作为跟进记录的默认跟进人。',
  },
  access: {
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && data.email && !data.displayName) {
          data.displayName = String(data.email).split('@')[0]
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      label: '显示名称',
      admin: {
        description: '招商顾问姓名，用于跟进记录展示。',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: '角色',
      defaultValue: 'advisor',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '招商顾问', value: 'advisor' },
        { label: '内容编辑', value: 'editor' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}