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
      name: 'leadType',
      type: 'select',
      required: true,
      defaultValue: 'leasing',
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
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
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
    },
    {
      name: 'hasCampusExperience',
      type: 'checkbox',
    },
    {
      name: 'remark',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: '新线索', value: 'new' },
        { label: '已联系', value: 'contacted' },
        { label: '意向明确', value: 'interested' },
        { label: '已约看', value: 'viewing_scheduled' },
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
    },
    {
      name: 'projectTitle',
      type: 'text',
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
        // 兼容微信小程序提交的 projectId 字段
        if (data.projectId && !data.project) {
          data.project = data.projectId
        }

        // 如果是新建，或者项目关联发生了变化，则同步更新 projectTitle
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
              if (project) {
                data.projectTitle = project.title
              } else {
                data.projectTitle = ''
              }
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
