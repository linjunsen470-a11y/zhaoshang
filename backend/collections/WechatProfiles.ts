import type { CollectionConfig } from 'payload'

export const WechatProfiles: CollectionConfig = {
  slug: 'wechat-profiles',
  dbName: 'wechat_profiles',
  lockDocuments: false,
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'ownerOpenId', type: 'text', unique: true, required: true },
    { name: 'nickname', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'phoneVerified', type: 'checkbox', defaultValue: false },
    { name: 'avatar', type: 'textarea' },
  ],
}
