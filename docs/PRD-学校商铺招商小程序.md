# 校园商铺招商平台 PRD

## 1. 项目定位

本项目从“学校商铺招商小程序”升级为“校园餐饮/商铺资源撮合平台”。平台围绕商户从找铺、评估、入驻、转让退出、设备处理的流程，提供小程序、网站、mock 管理后台和 Payload CMS 后台。

核心原则：

- 主营收方向优先：招商铺位、店铺委托转让、餐饮设备供需撮合。
- 辅助模块轻量化：开店预算测算、铺位评估、入驻清单作为获客和信任建设，不做复杂流程。
- 学生兼职派单不进入本系统。
- 网站与小程序共用机会数据、线索数据和跟进状态。

## 2. 业务模块

### 2.1 招商铺位

面向想进入校园经营的餐饮、零售、服务类商户。

主要能力：

- 展示食堂档口、校园商业街、校内铺位、校外临校铺位、校园服务点。
- 支持按区域、学校、项目类型、预算、适合业态、状态筛选。
- 项目详情展示面积、费用、学校、地址、适合/不适合业态、项目亮点、合作方式、看铺安排。
- 增加轻量评估信息：人流/位置标签、设施条件标签、顾问提示。
- 用户可提交找铺需求，形成 `leasing` 类型线索。

### 2.2 店铺委托转让

面向希望退出、换店或处理存量店铺的校园商户。

主要能力：

- 商户提交店铺位置、当前业态、面积费用、转让费预期、剩余合同期、是否含设备、补充说明。
- 后台人工审核后，可选择公开展示或内部定向撮合。
- 转让机会使用 `opportunityType=transfer` 管理。
- 转让需求形成 `leadType=transfer` 线索。

注意事项：

- 校园店铺和食堂档口可能受合同、校方准入、经营主体变更限制影响。
- 平台文案应强调“委托转让/退出协助”，避免表达为可自由转让。

### 2.3 餐饮设备供需

面向开店商户和退店商户。

主要能力：

- 支持出售设备、求购设备、回收咨询三类入口。
- 设备信息包含设备名称、规格数量、预算/期望价格、所在区域、补充说明。
- 第一版不做在线交易、支付、担保和聊天，只做线索撮合。
- 对应线索类型：`equipment_sell`、`equipment_buy`、`equipment_recycle`。

### 2.4 品牌合作

保持轻量入口，不做复杂加盟平台。

适用场景：

- 品牌方找校园点位。
- 学校/物业希望引入品牌。
- 个人商户了解品牌合作可能性。

对应线索类型：`brand_cooperation`。

### 2.5 辅助模块

辅助模块用于获客和信任建设，不作为第一阶段重开发对象。

- 开店预算测算：第一版只在首页设置入口，引导用户提交找铺需求。
- 铺位评估：以详情页标签和顾问提示呈现。
- 入驻清单：后续可做为网站内容页，用于 SEO 和减少沟通成本。

## 3. 产品端

### 3.1 小程序端

首页主入口：

- 找校园铺位
- 委托店铺转让
- 买卖餐饮设备
- 开店预算测算

页面结构：

- `pages/index`：首页、搜索、业务入口、推荐机会。
- `pages/list`：机会列表，展示招商铺位和转让机会。
- `pages/detail`：机会详情。
- `pages/apply`：找铺需求提交。
- `pages/transfer`：委托转让提交。
- `pages/equipment`：设备供需提交。
- `pages/leads`：我的需求/咨询记录。
- `pages/my`：用户资料、我的需求、我的收藏。

Demo 模式：

- `mp/app.js` 默认 `useLocalMock=true`。
- 小程序在 demo 模式下不发起 `wx.request`，避免微信开发者工具合法域名校验拦截本地 `127.0.0.1`。
- 如需联调本地 API，将 `useLocalMock` 改为 `false`，并在开发者工具中关闭“校验合法域名”。

### 3.2 网站端

网站用于公开展示、搜索获客和合作方背书。

第一版页面：

- 平台首页
- 精选机会展示
- 统一需求表单

后续可扩展：

- 招商铺位列表/详情
- 转让机会列表/详情
- 设备供需页
- 入驻清单和开店指南内容页

网站表单提交后写入同一线索池，来源标记为 `sourceChannel=website`。

### 3.3 管理后台

当前有两套后台形态：

- `admin/` 静态 mock 后台：用于 demo、演示、快速本地调试。
- `backend/` Payload CMS + Next.js：用于生产方向的后台和网站。

后台核心能力：

- 数据看板：机会总数、开放中机会、转让机会、设备线索、待联系线索、成交线索。
- 机会管理：按业务类型、状态筛选招商铺位和转让机会。
- 线索跟进：按线索类型、状态筛选，记录沟通内容和下次跟进时间。
- 商户档案：Payload 中预留 `merchant-profiles` 集合，用于未来沉淀长期商户需求。

## 4. 数据模型

### 4.1 Opportunity / Project

```ts
interface Project {
  id: string;
  opportunityType: 'leasing' | 'transfer';
  title: string;
  city?: string;
  district?: string;
  addressText?: string;
  schoolName?: string;
  schoolAlias?: string;
  showFullSchoolName?: boolean;
  projectType: string;
  areaText?: string;
  feeText?: string;
  suitableBusiness?: string[];
  unsuitableBusiness?: string[];
  highlights?: string[];
  trafficTags?: string[];
  facilityTags?: string[];
  advisorTips?: string;
  customerInfo?: string;
  cooperationMode?: string;
  viewingTimeText?: string;
  coverImage?: string;
  images?: string[];
  transferInfo?: {
    currentBusiness?: string;
    monthlyRent?: string;
    remainingTerm?: string;
    includesEquipment?: boolean;
    expectedTransferFee?: string;
    contractTransferAllowed?: string;
  };
  status: 'draft' | 'online' | 'coming' | 'full' | 'offline';
  auditStatus: 'pending' | 'approved' | 'rejected';
  isRecommended: boolean;
  sort: number;
  remark?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 4.2 Lead

```ts
interface Lead {
  id: string;
  leadType:
    | 'leasing'
    | 'transfer'
    | 'equipment_sell'
    | 'equipment_buy'
    | 'equipment_recycle'
    | 'brand_cooperation';
  sourceChannel: 'mini_program' | 'website' | 'admin';
  projectId?: string;
  projectTitle?: string;
  name: string;
  phone: string;
  businessType?: string;
  budgetRange?: string;
  regionPreference?: string;
  hasCampusExperience?: boolean;
  remark?: string;
  status:
    | 'new'
    | 'contacted'
    | 'interested'
    | 'viewing_scheduled'
    | 'viewed'
    | 'negotiating'
    | 'closed'
    | 'invalid'
    | 'paused';
  owner?: string;
  nextFollowAt?: number;
  closedAmount?: number;
  lostReason?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 4.3 FollowRecord

```ts
interface FollowRecord {
  id: string;
  leadId: string;
  content: string;
  nextFollowAt?: number;
  operatorId?: string;
  operatorName?: string;
  createdAt: number;
}
```

### 4.4 MerchantProfile

```ts
interface MerchantProfile {
  id: string;
  name: string;
  phone: string;
  businessTypes?: string[];
  budgetRange?: string;
  preferredRegion?: string;
  acceptsTransfer?: boolean;
  needsEquipment?: boolean;
  hasCampusExperience?: boolean;
  status: 'active' | 'closed' | 'paused' | 'invalid';
  notes?: string;
}
```

## 5. API 约定

Mock 服务入口：`server.js`

主要接口：

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/leads`
- `POST /api/leads`
- `PUT /api/leads/:id`
- `POST /api/leads/:id/follow`
- `GET /api/stats`

常用筛选参数：

- `opportunityType`
- `leadType`
- `status`
- `district`
- `projectType`
- `business`
- `budget`
- `q`
- `phone`

## 6. 部署与验证

本地 mock：

```bash
pnpm dev
```

Payload/Next 后台：

```bash
pnpm backend:dev
pnpm backend:lint
pnpm backend:build
```

Docker 生产构建：

```bash
cp .env.example .env
docker compose up -d --build
```

验证要求：

- 小程序 demo 模式无需配置合法域名即可打开。
- 找铺、转让、设备三类表单均能形成线索。
- 网站提交表单后，后台线索来源应为 `website`。
- 后台可按业务类型和状态筛选线索。
- `pnpm backend:lint` 和 `pnpm backend:build` 通过。
