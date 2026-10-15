import { commercialId, commercialScene, publicCommercialWhere, validateCommercial } from '../lib/commercial'
import type { CollectionConfig } from 'payload'
import { canManageProjects, isAdminUser, isStaffUser } from './shared/access'
import {
  ADMIN_GROUPS,
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_SCENE_OPTIONS,
  LISTING_KIND_OPTIONS,
  CITY_OPTIONS,
  DISTRICT_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from './shared/fieldOptions'
import { getProjectMissingFields } from '../lib/cmsRules.mjs'

export { getProjectMissingFields } from '../lib/cmsRules.mjs'

export const PUBLIC_PROJECT_STATUSES = ['online', 'coming', 'full'] as const

function relationId(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    plural: '项目与铺位',
    singular: '房源',
  },
  admin: {
    // Visible so document routes (/create, /:id) work. Default Payload nav groups
    // are hidden via admin-theme.css; primary entry is /admin dashboard.
    useAsTitle: 'title',
    defaultColumns: ['title', 'opportunityType', 'status', 'district', 'feeText', 'isRecommended', 'updatedAt'],
    description: '整理、修改并上下架小程序中的项目与铺位。',
    listSearchableFields: ['title', 'schoolName', 'schoolAlias', 'venueName', 'addressText'],
    group: ADMIN_GROUPS.properties,
    components: {
      views: {
        list: {
          Component: '@/app/admin/components/PropertyWorkspace',
        },
      },
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && isStaffUser(user)) return true
      return publicCommercialWhere()
    },
    create: ({ req: { user } }) => canManageProjects(user),
    update: ({ req: { user } }) => canManageProjects(user),
    delete: ({ req: { user } }) => isAdminUser(user),
  },
  hooks: {
    beforeDelete: [async ({ id, req }) => {
      const children = await req.payload.count({ collection: 'projects', where: { parentProject: { equals: id } }, overrideAccess: true, req })
      if (children.totalDocs) throw new Error('存在所属铺位，不能直接删除项目')
    }],
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        data.legacyUnclassified = req.context?.commercialMigration ? Boolean(data.legacyUnclassified) : Boolean(originalDoc?.legacyUnclassified)
        data.listingKind = data.listingKind || originalDoc?.listingKind || 'unit'
        if (data.businessScene === undefined && !originalDoc?.businessScene) {
          data.businessScene = commercialScene({ ...(originalDoc || {}), ...data }) || null
        }
        if (data.listingKind === 'unit' && !data.parentProject && operation === 'create' && req.query?.parentProject) {
          const parent = await req.payload.findByID({ collection: 'projects', id: String(req.query.parentProject), depth: 0, req })
          Object.assign(data, { parentProject: parent.id, businessScene: parent.businessScene, city: parent.city, district: parent.district })
        }
        const merged = { ...(originalDoc || {}), ...(data || {}) } as Record<string, unknown>
        const problem = validateCommercial(merged)
        if (problem) throw new Error(problem)
        const parentId = commercialId(merged.parentProject)
        if (parentId) {
          if (String(parentId) === String(originalDoc?.id)) throw new Error('不能关联自身')
          const parent = await req.payload.findByID({ collection: 'projects', id: parentId, depth: 0, overrideAccess: true, req })
          if (parent.listingKind !== 'project') throw new Error('所属项目必须是整项目招商')
          if (commercialScene(parent) !== commercialScene(merged) || parent.city !== merged.city || parent.district !== merged.district) {
            throw new Error('关联铺位必须与所属项目的场景、城市和区域一致')
          }
        }
        if (originalDoc?.id && ['listingKind', 'businessScene', 'city', 'district'].some(key => merged[key] !== originalDoc[key])) {
          const children = await req.payload.count({ collection: 'projects', where: { parentProject: { equals: originalDoc.id } }, overrideAccess: true, req })
          if (children.totalDocs) throw new Error('存在所属铺位，请先处理关联，再修改项目类型、场景或地区')
        }
        if (PUBLIC_PROJECT_STATUSES.includes(merged.status as (typeof PUBLIC_PROJECT_STATUSES)[number]) && !merged.businessScene && !merged.legacyUnclassified) {
          throw new Error('新记录上架必须选择商业场景')
        }
        if (PUBLIC_PROJECT_STATUSES.includes(merged.status as (typeof PUBLIC_PROJECT_STATUSES)[number])) {
          const missing = getProjectMissingFields(merged)
          if (missing.length) {
            throw new Error(`房源暂不能上架，请补充：${missing.join('、')}`)
          }

          const mediaIds = [
            relationId(merged.coverImage),
            ...(Array.isArray(merged.images) ? merged.images.map(relationId) : []),
          ].filter((id): id is string | number => id !== undefined)
          for (const id of new Set(mediaIds)) {
            const media = await req.payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
            if (media.source === 'lead_attachment') {
              throw new Error('用户咨询附件不能直接公开，请重新上传已审核的房源图片')
            }
          }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'legacyUnclassified', access: { read: ({ req: { user } }) => isStaffUser(user) }, type: 'checkbox', defaultValue: false, admin: { hidden: true, readOnly: true } },
    { name: 'listingKind', type: 'select', required: true, defaultValue: 'unit', label: '发布内容', options: LISTING_KIND_OPTIONS, index: true },
    { name: 'businessScene', type: 'select', label: '商业场景', options: BUSINESS_SCENE_OPTIONS, index: true },
    { name: 'parentProject', type: 'relationship', relationTo: 'projects', label: '所属项目', index: true, maxDepth: 1,
      filterOptions: { listingKind: { equals: 'project' } },
      admin: { condition: data => data?.listingKind !== 'project', description: '可留空作为独立铺位；所属项目下架后，关联铺位暂停公开。' } },
    { name: 'venueName', type: 'text', label: '商业项目/位置名称', admin: { condition: data => data?.businessScene !== 'campus' } },
    { name: 'unitLocation', type: 'text', label: '楼层/铺位位置', admin: { condition: data => data?.listingKind !== 'project' } },
    { type: 'row', fields: [
      { name: 'areaMin', type: 'number', min: 0, label: '招商面积下限（㎡）' },
      { name: 'areaMax', type: 'number', min: 0, label: '招商面积上限（㎡）' },
    ] },
    { type: 'row', fields: [
      { name: 'monthlyRentMin', type: 'number', min: 0, label: '基础月租下限（元/月）' },
      { name: 'monthlyRentMax', type: 'number', min: 0, label: '基础月租上限（元/月）' },
    ] },
    { name: 'communityInfo', type: 'textarea', label: '周边客群与主要营业时段', admin: { condition: data => data?.businessScene === 'community' } },
    { name: 'tourismInfo', type: 'textarea', label: '旺淡季、经营时段与常驻要求', admin: { condition: data => data?.businessScene === 'tourism' } },
    { name: 'mallInfo', type: 'textarea', label: '个体/非连锁品牌准入及营业要求', admin: { condition: data => data?.businessScene === 'mall' } },
    { name: 'introduction', type: 'textarea', label: '项目/铺位介绍' },
    { name: 'operatingRequirements', type: 'textarea', label: '经营要求' },
    { name: 'premisesConditions', type: 'textarea', label: '工程条件说明', admin: { description: '排烟、燃气、上下水、电力等；未确认的条件注明待核实。' } },

    {
      name: 'seedKey', access: { read: ({ req: { user } }) => isStaffUser(user) },
      type: 'text',
      unique: true,
      admin: { hidden: true },
    },
    {
      type: 'collapsible',
      label: '上架必填信息',
      admin: {
        initCollapsed: false,
        description: '完成以下信息后即可直接上架，无需额外审核。',
      },
      fields: [
        {
          name: 'coverImage',
          type: 'upload',
          relationTo: 'media',
          label: '封面图',
          required: true,
          admin: { description: '建议使用 4:3 或 16:9 横图。' },
        },
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true, label: '房源标题' },
            {
              name: 'opportunityType',
              type: 'select',
              required: true,
              defaultValue: 'leasing',
              label: '房源业务类型',
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
            { name: 'city', type: 'select', label: '城市', defaultValue: '广州', options: CITY_OPTIONS },
            { name: 'district', type: 'select', required: true, label: '区域/区县', options: DISTRICT_OPTIONS },
            {
              name: 'projectType',
              type: 'select',
              label: '校园细分类',
              admin: { condition: data => data?.businessScene === 'campus' },
              options: PROJECT_TYPE_OPTIONS,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'schoolName', type: 'text', label: '学校名称', admin: { condition: data => data?.businessScene === 'campus' } },
            { name: 'schoolAlias', type: 'text', label: '学校简称', admin: { condition: data => data?.businessScene === 'campus' } },
            { name: 'showFullSchoolName', type: 'checkbox', defaultValue: false, label: '显示完整学校名', admin: { condition: data => data?.businessScene === 'campus' } },
          ],
        },
        {
          name: 'addressText',
          type: 'text',
          label: '详细地址',
          admin: { placeholder: '例如：第一食堂二楼 A05 档口…' },
        },
        {
          type: 'row',
          fields: [
            { name: 'areaText', type: 'text', label: '面积', admin: { placeholder: '例如：15m²…' } },
            {
              name: 'feeText',
              type: 'text',
              required: true,
              label: '费用说明',
              admin: { placeholder: '例如：3 万元/年，另收 2% 管理费…' },
            },
          ],
        },
        {
          name: 'customerInfo',
          type: 'textarea',
          required: true,
          label: '客群说明',
          admin: { description: '说明主要客群、消费时段及资料来源。' },
        },
        {
          name: 'images',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          minRows: 1,
          label: '详情轮播图',
          admin: { description: '至少上传 1 张实景图。' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: '展示增强信息',
      admin: { initCollapsed: false },
      fields: [
        { name: 'suitableBusiness', type: 'select', hasMany: true, label: '适合业态', options: BUSINESS_TYPE_OPTIONS },
        { name: 'unsuitableBusiness', type: 'select', hasMany: true, label: '不适合业态', options: BUSINESS_TYPE_OPTIONS },
        {
          name: 'highlights',
          type: 'text',
          hasMany: true,
          label: '房源亮点',
          admin: { description: '每输入一条按回车继续添加。' },
        },
        { name: 'cooperationMode', type: 'textarea', label: '合作方式' },
        { name: 'viewingTimeText', type: 'textarea', label: '看铺安排' },
      ],
    },
    {
      type: 'collapsible',
      label: '转让专属信息',
      admin: {
        initCollapsed: false,
        condition: data => data?.opportunityType === 'transfer',
      },
      fields: [
        {
          name: 'transferInfo',
          type: 'group',
          label: false,
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
      name: 'sourceLead', access: { read: ({ req: { user } }) => isStaffUser(user) },
      type: 'relationship',
      relationTo: 'leads',
      label: '来源咨询',
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'sourceLeadKey', access: { read: ({ req: { user } }) => isStaffUser(user) },
      type: 'text',
      unique: true,
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'miniProgramPreview',
      type: 'ui',
      label: '发布操作',
      admin: {
        position: 'sidebar',
        components: { Field: '@/app/admin/components/ProjectEditHints' },
      },
    },
    {
      name: 'status',
      type: 'select',
      label: '房源状态',
      options: [...PROPERTY_STATUS_OPTIONS],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
        description: '开放中、即将开放和已满/已转可公开。整项目已满时请检查子铺位状态；父项目下架时子铺位暂停公开。',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      defaultValue: false,
      label: '重点推荐',
      admin: { position: 'sidebar' },
    },
    {
      name: 'sort',
      type: 'number',
      defaultValue: 0,
      label: '排序权重',
      admin: {
        position: 'sidebar',
        description: '数值越大越靠前。',
      },
    },
    {
      name: 'remark', access: { read: ({ req: { user } }) => isStaffUser(user) },
      type: 'textarea',
      label: '内部备注',
      admin: {
        position: 'sidebar',
        description: '仅后台可见。',
      },
    },
  ],
  timestamps: true,
}
