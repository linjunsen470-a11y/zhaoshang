import type { CollectionConfig, Where } from 'payload'
import { canManageProjects, isAdminUser, isStaffUser } from './shared/access'
import {
  ADMIN_GROUPS,
  BUSINESS_TYPE_OPTIONS,
  CITY_OPTIONS,
  DISTRICT_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from './shared/fieldOptions'

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    plural: '招商项目',
    singular: '招商项目',
  },
  admin: {
    group: ADMIN_GROUPS.operations,
    useAsTitle: 'title',
    defaultColumns: ['title', 'opportunityType', 'status', 'auditStatus', 'district', 'isRecommended', 'updatedAt'],
    description: '管理小程序展示的招商铺位与转让项目。上线前请确认审核状态为「已通过」。',
    listSearchableFields: ['title', 'schoolName', 'schoolAlias', 'district', 'addressText'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && isStaffUser(user)) {
        return true
      }
      return {
        and: [
          { status: { in: ['online', 'coming', 'full'] } },
          { auditStatus: { equals: 'approved' } },
        ],
      } as Where
    },
    create: ({ req: { user } }) => canManageProjects(user),
    update: ({ req: { user } }) => canManageProjects(user),
    delete: ({ req: { user } }) => isAdminUser(user),
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.status === 'online' && data?.auditStatus && data.auditStatus !== 'approved') {
          throw new Error('审核未通过的项目不能设为「开放中」，请先将审核状态改为「已通过」。')
        }
        return data
      },
    ],
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
          description: '标题、位置、学校与封面图。封面图会显示在小程序列表和详情页顶部。',
          fields: [
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
              label: '封面图',
              required: true,
              admin: {
                description: '建议上传横图，比例 4:3 或 16:9。',
              },
            },
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
                  type: 'select',
                  label: '城市',
                  defaultValue: '广州',
                  options: CITY_OPTIONS,
                },
                {
                  name: 'district',
                  type: 'select',
                  label: '区域/区县',
                  options: DISTRICT_OPTIONS,
                  admin: {
                    description: '与小程序「找铺」筛选一致，请从列表中选择。',
                  },
                },
                {
                  name: 'addressText',
                  type: 'text',
                  label: '详细地址',
                  admin: {
                    placeholder: '例如：广州华商学院荔湖校区第一食堂二楼 A05 档口',
                  },
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
                  admin: {
                    placeholder: '例如：华商学院',
                  },
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
              options: PROJECT_TYPE_OPTIONS,
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
                  admin: {
                    placeholder: '例如：15m²',
                  },
                },
                {
                  name: 'feeText',
                  type: 'text',
                  label: '费用说明',
                  admin: {
                    placeholder: '例如：3万元/年，另收 2% 管理费',
                  },
                },
              ],
            },
            {
              name: 'suitableBusiness',
              type: 'select',
              hasMany: true,
              label: '适合业态',
              options: BUSINESS_TYPE_OPTIONS,
            },
            {
              name: 'unsuitableBusiness',
              type: 'select',
              hasMany: true,
              label: '不适合业态',
              options: BUSINESS_TYPE_OPTIONS,
            },
            {
              name: 'highlights',
              type: 'text',
              hasMany: true,
              label: '项目亮点',
              admin: {
                description: '输入一条后按回车继续添加。',
              },
            },
            {
              name: 'cooperationMode',
              type: 'textarea',
              label: '合作方式',
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
          label: '内部备注',
          description: '以下字段仅供后台内部参考，当前小程序详情页不会展示。',
          fields: [
            {
              name: 'advisorTips',
              type: 'textarea',
              label: '顾问提示',
              admin: {
                description: '内部备忘，小程序端暂不展示。',
              },
            },
            {
              name: 'trafficTags',
              type: 'text',
              hasMany: true,
              label: '人流/位置标签',
              admin: {
                description: '内部标签，小程序端暂不展示。',
              },
            },
            {
              name: 'facilityTags',
              type: 'text',
              hasMany: true,
              label: '设施条件标签',
              admin: {
                description: '内部标签，小程序端暂不展示。',
              },
            },
          ],
        },
        {
          label: '详情图',
          fields: [
            {
              name: 'images',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: '详情轮播图',
              admin: {
                description: '上传多张实景图，将显示在小程序详情页轮播区域。',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'miniProgramPreview',
      type: 'ui',
      label: '小程序预览',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/app/admin/components/ProjectEditHints',
        },
      },
    },
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
        description: '控制小程序是否展示及展示样式。设为「开放中」前需审核通过。',
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
      defaultValue: 'pending',
      required: true,
      admin: {
        position: 'sidebar',
        description: '内容审核流程。「已通过」后才可上线为「开放中」。',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      defaultValue: false,
      label: '重点推荐',
      admin: {
        position: 'sidebar',
        description: '勾选后出现在小程序首页「重点推荐」区域。',
      },
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
      label: '排序权重',
      admin: {
        position: 'sidebar',
        description: '数值越大越靠前，相同权重按更新时间排序。',
      },
    },
    {
      name: 'remark',
      type: 'textarea',
      label: '内部备注',
      admin: {
        position: 'sidebar',
        description: '仅后台可见，不会展示给用户。',
      },
    },
  ],
  timestamps: true,
}