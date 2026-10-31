import type { CollectionConfig, Where } from 'payload'
import { isAdminUser } from './shared/access'
import { ADMIN_GROUPS } from './shared/fieldOptions'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    plural: '用户管理',
    singular: '用户',
  },
  auth: true,
  admin: {
    // Not hidden: System Settings links open native collection UI.
    // Default nav groups are suppressed via admin-theme.css.
    group: ADMIN_GROUPS.system,
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'email', 'role'],
    description: '管理员负责账号与系统设置；普通用户负责房源、咨询和设备。',
  },
  access: {
    create: ({ req: { user } }) => isAdminUser(user),
    read: ({ req: { user } }) => {
      if (isAdminUser(user)) return true
      if (!user?.id) return false
      return { id: { equals: user.id } } as Where
    },
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
      label: '姓名',
      admin: {
        description: '填写员工姓名。',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: '角色',
      defaultValue: 'editor',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '普通用户', value: 'editor' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
