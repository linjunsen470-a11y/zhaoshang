import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
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
    },
    {
      name: 'ownerOpenId',
      type: 'text',
      label: '上传用户 OpenID',
      admin: {
        readOnly: true,
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
    },
    {
      name: 'originalFilename',
      type: 'text',
      label: '原始文件名',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'compressedSize',
      type: 'number',
      label: '压缩后大小',
      admin: {
        readOnly: true,
      },
    },
  ],
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
  },
}
