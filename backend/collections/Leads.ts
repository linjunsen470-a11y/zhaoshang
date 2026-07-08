import type { CollectionConfig } from 'payload'
import { canManageLeads, isAdminUser } from './shared/access'
import { ADMIN_GROUPS } from './shared/fieldOptions'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    plural: '咨询线索',
    singular: '咨询线索',
  },
  admin: {
    group: ADMIN_GROUPS.operations,
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'leadType', 'status', 'owner', 'projectTitle', 'nextFollowAt', 'createdAt'],
    description: '处理来自小程序及后台录入的找铺、转让、设备咨询。跟进记录请在「跟进历史」标签页添加。',
    listSearchableFields: ['name', 'phone', 'businessType', 'regionPreference', 'projectTitle'],
    components: {
      views: {
        kanban: {
          Component: '@/app/admin/components/LeadsKanbanView',
          path: '/kanban',
        },
      },
    },
  },
  access: {
    read: ({ req: { user } }) => canManageLeads(user),
    create: ({ req: { user } }) => canManageLeads(user),
    update: ({ req: { user } }) => canManageLeads(user),
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
      type: 'tabs',
      tabs: [
        {
          label: '基本需求',
          fields: [
            {
              name: 'leadQuickActions',
              type: 'ui',
              label: '快捷操作',
              admin: {
                components: {
                  Field: '@/app/admin/components/LeadQuickActions',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  label: '客户称呼',
                },
                {
                  name: 'phone',
                  type: 'text',
                  required: true,
                  label: '联系电话',
                  admin: {
                    description: '顾问联系客户的主要号码。',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
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
                    { label: '品牌合作（仅后台）', value: 'brand_cooperation' },
                    { label: '装修咨询', value: 'renovation_consult' },
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
              ],
            },
            {
              type: 'row',
              fields: [
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
              ],
            },
            {
              name: 'hasCampusExperience',
              type: 'checkbox',
              label: '有校园经营经验',
            },
            {
              name: 'attachments',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: '用户上传图片/附件',
            },
            {
              name: 'transferDetails',
              type: 'group',
              label: '店铺转让专属信息',
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
              label: '设备供需专属信息',
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
              name: 'renovationDetails',
              type: 'group',
              label: '装修专属信息',
              admin: {
                condition: (_, siblingData) => siblingData?.leadType === 'renovation_consult',
              },
              fields: [
                { name: 'shopArea', type: 'text', label: '店铺面积' },
                {
                  name: 'renovationType',
                  type: 'select',
                  label: '装修类型',
                  options: [
                    { label: '新铺装修', value: 'new_build' },
                    { label: '旧铺翻新', value: 'renovation' },
                    { label: '局部改造', value: 'partial' },
                  ],
                },
                { name: 'designStyle', type: 'text', label: '设计风格偏好' },
                { name: 'budgetText', type: 'text', label: '装修预算' },
                { name: 'expectedStartDate', type: 'text', label: '预期开工时间' },
              ],
            },
            {
              name: 'remark',
              type: 'textarea',
              label: '用户补充说明',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'submitterOpenId',
                  type: 'text',
                  label: '提交用户 OpenID',
                  admin: {
                    readOnly: true,
                    description: '微信用户标识，用于小程序端查询自己的咨询记录。',
                  },
                },
                {
                  name: 'projectTitle',
                  type: 'text',
                  label: '关联项目标题',
                  admin: {
                    readOnly: true,
                  },
                },
              ],
            },
          ],
        },
        {
          label: '跟进历史',
          description: '在此添加跟进记录。新建线索请先保存，再录入第一条跟进。',
          fields: [
            {
              name: 'followTimeline',
              type: 'ui',
              label: '跟进记录',
              admin: {
                components: {
                  Field: '@/app/admin/components/LeadFollowTimeline',
                },
              },
            },
          ],
        },
      ],
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
      admin: {
        position: 'sidebar',
        description: '更新客户跟进阶段，用户可在小程序「我的咨询记录」中查看。',
      },
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      label: '关联招商项目',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'merchantProfile',
      type: 'relationship',
      relationTo: 'merchant-profiles',
      label: '关联商户档案',
      admin: {
        position: 'sidebar',
        description: '高意向客户可沉淀为长期商户档案。',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      label: '跟进负责人',
      admin: {
        position: 'sidebar',
        description: '指定负责跟进的顾问；新建线索时默认当前登录账号。',
      },
    },
    {
      name: 'nextFollowAt',
      type: 'date',
      label: '下次跟进时间',
      admin: {
        position: 'sidebar',
        description: '添加跟进记录时可自动同步；也可在此手动调整。',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'closedAmount',
      type: 'number',
      label: '成交金额/服务费 (元)',
      admin: {
        position: 'sidebar',
        condition: data => ['closed', 'invalid'].includes(data?.status),
      },
    },
    {
      name: 'lostReason',
      type: 'text',
      label: '流失/失败原因',
      admin: {
        position: 'sidebar',
        condition: data => ['closed', 'invalid', 'paused'].includes(data?.status),
      },
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

        if (operation === 'create' && req.user && !data.owner) {
          data.owner = req.user.id
        }

        return data
      },
    ],
  },
  timestamps: true,
}