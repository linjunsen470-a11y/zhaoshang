import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'opportunityType', 'status', 'auditStatus', 'district'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'opportunityType',
      type: 'select',
      required: true,
      defaultValue: 'leasing',
      options: [
        { label: '招商铺位', value: 'leasing' },
        { label: '店铺转让', value: 'transfer' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'district',
      type: 'text',
    },
    {
      name: 'addressText',
      type: 'text',
    },
    {
      name: 'schoolName',
      type: 'text',
    },
    {
      name: 'schoolAlias',
      type: 'text',
    },
    {
      name: 'showFullSchoolName',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'projectType',
      type: 'select',
      options: ['食堂档口', '校园商业街', '校内铺位', '校外临校铺位', '校园服务点', '店铺转让', '其他'],
      required: true,
    },
    {
      name: 'areaText',
      type: 'text',
    },
    {
      name: 'feeText',
      type: 'text',
    },
    {
      name: 'suitableBusiness',
      type: 'array',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'unsuitableBusiness',
      type: 'array',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'highlights',
      type: 'array',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'trafficTags',
      type: 'array',
      label: '人流/位置标签',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'facilityTags',
      type: 'array',
      label: '设施条件标签',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'advisorTips',
      type: 'textarea',
      label: '顾问提示',
    },
    {
      name: 'customerInfo',
      type: 'textarea',
    },
    {
      name: 'cooperationMode',
      type: 'textarea',
    },
    {
      name: 'viewingTimeText',
      type: 'textarea',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'transferInfo',
      type: 'group',
      admin: {
        condition: (_, siblingData) => siblingData?.opportunityType === 'transfer',
      },
      fields: [
        { name: 'currentBusiness', type: 'text', label: '当前业态' },
        { name: 'monthlyRent', type: 'text', label: '月租/管理费' },
        { name: 'remainingTerm', type: 'text', label: '剩余合同期' },
        { name: 'includesEquipment', type: 'checkbox', label: '是否含设备' },
        { name: 'expectedTransferFee', type: 'text', label: '转让费预期' },
        { name: 'contractTransferAllowed', type: 'text', label: '合同是否允许转让' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '开放中', value: 'online' },
        { label: '即将开放', value: 'coming' },
        { label: '已满/已转', value: 'full' },
        { label: '已下架', value: 'offline' },
      ],
      defaultValue: 'draft',
      required: true,
    },
    {
      name: 'auditStatus',
      type: 'select',
      options: [
        { label: '待审核', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
      ],
      defaultValue: 'approved',
      required: true,
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'remark',
      type: 'textarea',
    },
  ],
  timestamps: true,
}
