import type { CollectionConfig, Where } from 'payload'
import { canManageProjects, isAdminUser, isStaffUser } from './shared/access'
import { ADMIN_GROUPS } from './shared/fieldOptions'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    plural: '媒体库',
    singular: '媒体文件',
  },
  admin: {
    // Not hidden: System Settings links open native collection UI.
    // Default nav groups are suppressed via admin-theme.css.
    group: ADMIN_GROUPS.system,
    description: '项目图片、线索附件与后台上传素材。线索附件请在线索详情中管理，避免误删用户图片。',
    defaultColumns: ['filename', 'source', 'alt', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (isStaffUser(user)) return true
      return { source: { not_equals: 'lead_attachment' } } as Where
    },
    create: ({ req: { user } }) => isStaffUser(user),
    update: ({ req: { user } }) => canManageProjects(user) || isAdminUser(user),
    delete: ({ req: { user } }) => isAdminUser(user),
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
      name: 'alt',
      type: 'text',
      label: '替代文本',
      admin: {
        description: '简要描述图片内容，便于识别。',
      },
    },
    {
      name: 'source',
      type: 'select',
      label: '来源',
      options: [
        { label: '演示种子数据', value: 'seed_demo' },
        { label: '线索附件', value: 'lead_attachment' },
        { label: '后台上传', value: 'admin' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ownerOpenId',
      type: 'text',
      label: '上传用户 OpenID',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: data => Boolean(data?.ownerOpenId),
      },
    },
    {
      name: 'originalFilename',
      type: 'text',
      label: '原始文件名',
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
    {
      name: 'compressedSize',
      type: 'number',
      label: '压缩后大小（字节）',
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
  ],
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
  },
}
