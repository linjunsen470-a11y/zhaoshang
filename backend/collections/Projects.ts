import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    plural: '招商与转让项目',
    singular: '招商与转让项目',
  },
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
      type: 'tabs',
      tabs: [
        {
          label: '基础信息',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  label: '项目标题/名称',
                },
                {
                  name: 'opportunityType',
                  type: 'select',
                  required: true,
                  defaultValue: 'leasing',
                  label: '商机类型',
                  options: [
                    { label: '招商铺位', value: 'leasing' },
                    { label: '店铺转让', value: 'transfer' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'city',
                  type: 'text',
                  label: '城市',
                },
                {
                  name: 'district',
                  type: 'text',
                  label: '区域/区县',
                },
                {
                  name: 'addressText',
                  type: 'text',
                  label: '详细地址',
                },
              ],
            },
            {
              type: 'row',
              fields: [
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
              ],
            },
            {
              name: 'projectType',
              type: 'select',
              label: '项目类型',
              options: [
                { label: '食堂档口', value: '食堂档口' },
                { label: '校园商业街', value: '校园商业街' },
                { label: '校内铺位', value: '校内铺位' },
                { label: '校外临校铺位', value: '校外临校铺位' },
                { label: '校园服务点', value: '校园服务点' },
                { label: '店铺转让', value: '店铺转让' },
                { label: '其他', value: '其他' },
              ],
              required: true,
            },
          ],
        },
        {
          label: '详情描述',
          fields: [
            {
              type: 'row',
              fields: [
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
              ],
            },
            {
              name: 'suitableBusiness',
              type: 'text',
              hasMany: true,
              label: '适合业态 (敲击回车可添加多个)',
            },
            {
              name: 'unsuitableBusiness',
              type: 'text',
              hasMany: true,
              label: '不适合业态 (敲击回车可添加多个)',
            },
            {
              name: 'highlights',
              type: 'text',
              hasMany: true,
              label: '项目亮点 (敲击回车可添加多个)',
            },
            {
              name: 'cooperationMode',
              type: 'textarea',
              label: '合作方式',
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
              name: 'viewingTimeText',
              type: 'textarea',
              label: '看铺安排',
            },
            {
              name: 'transferInfo',
              type: 'group',
              label: '转让专属信息',
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
          ],
        },
        {
          label: '配套与交通',
          fields: [
            {
              name: 'trafficTags',
              type: 'text',
              hasMany: true,
              label: '人流/位置标签 (敲击回车可添加多个)',
            },
            {
              name: 'facilityTags',
              type: 'text',
              hasMany: true,
              label: '设施条件标签 (敲击回车可添加多个)',
            },
          ],
        },
        {
          label: '媒体图片',
          fields: [
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
          ],
        },
      ],
    },
    // Sidebar fields
    {
      name: 'status',
      type: 'select',
      label: '发布状态',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '开放中', value: 'online' },
        { label: '即将开放', value: 'coming' },
        { label: '已满/已转', value: 'full' },
        { label: '已下架', value: 'offline' },
      ],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'auditStatus',
      type: 'select',
      label: '审核状态',
      options: [
        { label: '待审核', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
      ],
      defaultValue: 'approved',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      defaultValue: false,
      label: '重点推荐',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
      label: '排序权重 (越大越靠前)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'remark',
      type: 'textarea',
      label: '内部备注',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
