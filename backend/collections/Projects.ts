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
      name: 'seedKey',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
      },
    },
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
      label: '详细地址',
    },
    {
      name: 'schoolName',
      type: 'text',
      label: '学校名称',
    },
    {
      name: 'schoolAlias',
      type: 'text',
      label: '学校简称',
    },
    {
      name: 'showFullSchoolName',
      type: 'checkbox',
      defaultValue: false,
      label: '显示完整学校名',
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
      label: '面积',
    },
    {
      name: 'feeText',
      type: 'text',
      label: '费用说明',
    },
    {
      name: 'suitableBusiness',
      type: 'array',
      label: '适合业态',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'unsuitableBusiness',
      type: 'array',
      label: '不适合业态',
      fields: [{ name: 'item', type: 'text' }],
    },
    {
      name: 'highlights',
      type: 'array',
      label: '项目亮点',
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
      label: '客群说明',
    },
    {
      name: 'cooperationMode',
      type: 'textarea',
      label: '合作方式',
    },
    {
      name: 'viewingTimeText',
      type: 'textarea',
      label: '看铺安排',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: '封面图',
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: '详情图',
    },
    {
      name: 'transferInfo',
      type: 'group',
      label: '转让信息',
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
      label: '重点推荐',
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
      label: '排序',
    },
    {
      name: 'remark',
      type: 'textarea',
      label: '备注',
    },
  ],
  timestamps: true,
}
