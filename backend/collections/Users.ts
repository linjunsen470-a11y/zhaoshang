import type { CollectionConfig } from 'payload'
import { isAdminUser } from './shared/access'
import { ADMIN_GROUPS } from './shared/fieldOptions'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    plural: '管理员',
    singular: '管理员',
  },
  auth: true,
  admin: {
    // Not hidden: System Settings links open native collection UI.
    // Default nav groups are suppressed via admin-theme.css.
    group: ADMIN_GROUPS.system,
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'email', 'role'],
    description: '后台登录账号。管理员可管理账号与删除数据，编辑可维护房源、咨询和设备。',
  },
  access: {
    create: ({ req: { user } }) => isAdminUser(user),
    read: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => isAdminUser(user),
    delete: ({ req: { user } }) => isAdminUser(user),
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
      defaultValue: 'editor',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '内容编辑', value: 'editor' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
