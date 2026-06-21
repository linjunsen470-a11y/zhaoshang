import type { CollectionConfig } from 'payload'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'leadType', 'status', 'project'],
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: () => true,
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
      name: 'submitterOpenId',
      type: 'text',
      label: '提交用户 OpenID',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'leadType',
      type: 'select',
      required: true,
      defaultValue: 'leasing',
      label: '线索类型',
      options: [
        { label: '找铺咨询', value: 'leasing' },
        { label: '店铺转让', value: 'transfer' },
        { label: '出售设备', value: 'equipment_sell' },
        { label: '求购设备', value: 'equipment_buy' },
        { label: '回收咨询', value: 'equipment_recycle' },
        { label: '品牌合作', value: 'brand_cooperation' },
      ],
    },
    {
      name: 'sourceChannel',
      type: 'select',
      defaultValue: 'mini_program',
      label: '来源渠道',
      options: [
        { label: '小程序', value: 'mini_program' },
        { label: '网站', value: 'website' },
        { label: '后台录入', value: 'admin' },
      ],
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '称呼',
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: '手机号',
    },
    {
      name: 'businessType',
      type: 'text',
      label: '经营品类/设备名称',
    },
    {
      name: 'budgetRange',
      type: 'text',
      label: '预算/期望价格',
    },
    {
      name: 'regionPreference',
      type: 'text',
      label: '意向区域',
    },
    {
      name: 'hasCampusExperience',
      type: 'checkbox',
      label: '有校园经营经验',
    },
    {
      name: 'transferDetails',
      type: 'group',
      label: '店铺转让信息',
      admin: {
        condition: (_, siblingData) => siblingData?.leadType === 'transfer',
      },
      fields: [
        { name: 'locationText', type: 'text', label: '店铺位置' },
        { name: 'feeText', type: 'text', label: '面积与费用' },
        { name: 'transferFee', type: 'text', label: '转让费预期' },
        { name: 'remainingTerm', type: 'text', label: '剩余合同期' },
        { name: 'includesEquipment', type: 'checkbox', label: '是否包含设备' },
      ],
    },
    {
      name: 'equipmentDetails',
      type: 'group',
      label: '设备供需信息',
      admin: {
        condition: (_, siblingData) => ['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(siblingData?.leadType),
      },
      fields: [
        { name: 'equipmentName', type: 'text', label: '设备名称' },
        { name: 'specText', type: 'text', label: '数量/规格' },
        { name: 'equipmentCondition', type: 'text', label: '成色/说明' },
        { name: 'expectedPrice', type: 'text', label: '预算/期望价格' },
      ],
    },
    {
      name: 'attachments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: '用户上传图片',
    },
    {
      name: 'remark',
      type: 'textarea',
      label: '补充说明',
    },
    {
      name: 'status',
      type: 'select',
      label: '跟进状态',
      options: [
        { label: '新线索', value: 'new' },
        { label: '已联系', value: 'contacted' },
        { label: '意向明确', value: 'interested' },
        { label: '已约看铺', value: 'viewing_scheduled' },
        { label: '已看铺/已核实', value: 'viewed' },
        { label: '谈判中', value: 'negotiating' },
        { label: '已成交', value: 'closed' },
        { label: '无效', value: 'invalid' },
        { label: '暂缓', value: 'paused' },
      ],
      defaultValue: 'new',
      required: true,
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      label: '关联项目',
    },
    {
      name: 'projectTitle',
      type: 'text',
      label: '项目标题',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'owner',
      type: 'text',
      label: '负责人',
    },
    {
      name: 'nextFollowAt',
      type: 'date',
      label: '下次跟进时间',
    },
    {
      name: 'closedAmount',
      type: 'number',
      label: '成交金额/服务费',
    },
    {
      name: 'lostReason',
      type: 'text',
      label: '失败原因',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (data.projectId && !data.project) {
          data.project = data.projectId
        }

        const isProjectChanged = operation === 'create'
          ? !!data.project
          : (data.project !== undefined && data.project !== originalDoc?.project)

        if (isProjectChanged) {
          if (data.project) {
            try {
              const project = await req.payload.findByID({
                collection: 'projects',
                id: data.project,
              })
              data.projectTitle = project?.title || ''
            } catch (err) {
              console.error('Failed to fetch project title', err)
            }
          } else {
            data.projectTitle = ''
          }
        }

        return data
      },
    ],
  },
  timestamps: true,
}
