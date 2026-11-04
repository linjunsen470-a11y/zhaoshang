import type { CollectionConfig } from 'payload'
import { isAdminUser } from './shared/access'

// Keep the project ID even after a project is deleted so the owner can remove
// the unavailable item. The unique pair is also the basis for interest counts.
export const Favorites: CollectionConfig = {
  slug: 'favorites',
  labels: { singular: '收藏', plural: '收藏' },
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => isAdminUser(user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['ownerOpenId', 'projectId'], unique: true }],
  fields: [
    { name: 'ownerOpenId', type: 'text', required: true, index: true },
    { name: 'projectId', type: 'text', required: true, index: true },
  ],
  timestamps: true,
}
