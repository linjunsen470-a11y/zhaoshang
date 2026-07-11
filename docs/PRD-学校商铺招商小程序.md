# 校园商铺招商小程序 PRD

## 1. 项目定位

本项目是一个“校园商铺资源撮合平台”，服务对象包括想进入校园经营的商户、需要转让/退出的存量商户，以及有餐饮设备供需的商户。产品形态包括微信小程序、Payload CMS 后台、Next.js 网站/API 和本地 mock 演示模式。

核心原则：

- 主业务优先：招商铺位、店铺委托转让、餐饮设备供需撮合。
- 线索驱动：第一阶段不做在线交易、担保、聊天和复杂履约，只沉淀可跟进线索。
- 后台可运营：项目、线索、跟进记录和图片素材统一进入 Payload CMS。
- 用户可自助：用户可查看、编辑、删除自己提交的咨询记录。
- 本地可联调：支持微信 openid 生产链路，也支持 `devOpenId` 本地调试链路。
- 隐私合规：提供隐私政策页面，公开列表不暴露联系方式。

## 2. 用户角色

- 找铺商户：浏览项目，提交找铺咨询。
- 转让商户：提交店铺转让委托和店铺图片。
- 设备供需商户：发布或浏览设备出售、求购、回收需求。
- 招商顾问：在 CMS 中查看线索、补充跟进记录、更新状态。
- 平台管理员：维护项目、媒体、线索和后台用户。

## 3. 小程序功能

### 3.1 首页

金刚区布局：

- **主入口（独占一行）：** 找校园铺位
- **次入口（并列一行，3列并排）：** 委托店铺转让、餐饮设备（求购/出售/回收）、商铺装修咨询

已移除「开店测算」入口，避免名不副实的体验落差。

首页还应展示业态快捷入口、推荐项目横滑、最新项目列表，并支持搜索跳转找铺页。首屏需有加载态与失败重试，支持下拉刷新。

### 3.2 项目列表

展示招商铺位和转让机会。

筛选维度：

- 关键词 `q`
- 区域 `district`
- 项目类型 `projectType`
- 预算 `budget`
- 适合业态 `business`
- 机会类型 `opportunityType`（招商/转让来源筛选）
- 状态 `status`

支持收藏筛选和推荐项目筛选。从详情返回时不应无条件全量刷新；筛选变化、下拉刷新或首页带筛选参数时才重新请求。

### 3.3 项目详情

详情页展示：

- 多张项目图片，支持左右滑动和点击预览。
- 项目标题、状态、推荐标记、更新时间。
- 学校、项目类型、面积、费用、城市、区域、地址。
- 转让机会的当前业态、月租、剩余合同期、转让费。
- 适合/不适合业态。
- 项目亮点、客群说明、合作方式、看铺安排。
- 收藏、联系顾问、我要咨询。

### 3.4 找铺咨询表单

字段：

- 称呼（最长 20 字）
- 手机号
- 经营品类
- 投资预算
- 意向区域（最长 50 字）
- 是否有校园经营经验
- 补充说明（最长 500 字）
- 补充图片，最多 6 张

提交后生成 `leadType=leasing` 线索。图片上传前由小程序压缩，后端再次压缩并写入 Payload `media`。

首次提交前须勾选「已阅读并同意《隐私政策》」；未勾选不可提交。

从项目详情进入时，表单顶部应展示关联项目卡片（图、标题、费用等）。

支持编辑模式：通过 `leadId` 参数进入，调用 `GET /api/leads/:id` 加载原记录后更新。

### 3.5 店铺转让表单

字段：

- 称呼
- 手机号
- 店铺位置
- 当前业态
- 面积与费用
- 转让费预期
- 剩余合同期
- 是否包含设备
- 补充说明
- 店铺图片，最多 6 张

提交后生成 `leadType=transfer` 线索，并写入结构化字段：

```ts
transferDetails: {
  locationText?: string;
  feeText?: string;
  transferFee?: string;
  remainingTerm?: string;
  includesEquipment?: boolean;
}
```

首次提交前须勾选隐私政策同意，规则同找铺咨询表单。

支持编辑模式，规则同找铺咨询表单。

### 3.6 设备供需表单

类型：

- 出售设备 `equipment_sell`
- 求购设备 `equipment_buy`
- 回收咨询 `equipment_recycle`

字段：

- 称呼
- 手机号
- 设备名称
- 数量/规格
- 设备状态
- 采购预算/期望价格
- 所在区域
- 补充说明
- 设备图片，最多 6 张

提交后写入结构化字段：

```ts
equipmentDetails: {
  equipmentName?: string;
  specText?: string;
  equipmentCondition?: string;
  expectedPrice?: string;
}
```

首次提交前须勾选隐私政策同意，规则同找铺咨询表单。

支持编辑模式，规则同找铺咨询表单。

### 3.6a 商铺装修咨询表单

类型：
- 装修咨询 `renovation_consult`

字段：
- 称呼
- 手机号
- 店铺面积
- 装修类型（新铺装修、旧铺翻新、局部改造，使用 picker 选择）
- 设计风格偏好
- 装修预算
- 期望开工时间
- 需求描述（最长 500 字）
- 店铺现状照片，最多 6 张

提交后写入结构化字段：
```ts
renovationDetails: {
  shopArea?: string;
  renovationType?: 'new_build' | 'renovation' | 'partial';
  designStyle?: string;
  budgetText?: string;
  expectedStartDate?: string;
}
```

首次提交前须勾选隐私政策同意，规则同找铺咨询表单。

支持编辑模式，规则同找铺咨询表单。

### 3.7 设备供需列表

公开页面，展示其他用户发布的设备出售/求购/回收信息。

展示规则：

- 不展示联系人姓名和手机号。
- 区域与备注做截断脱敏。
- 用户通过「联系顾问」与平台对接。
- 支持按类型 Tab 筛选和下拉刷新。

### 3.8 我的咨询记录

用户只能查看自己提交的历史线索。

身份策略：

- 生产模式使用微信 `openid`。
- 本地联调模式使用 `devOpenId`。
- 后端在 `leads.submitterOpenId` 中记录提交人。
- `GET /api/leads` 对带 token 的小程序请求按 `submitterOpenId` 过滤。
- 修改「我的」页联系信息只影响后续表单自动填充，不改变历史记录归属。

记录页展示：

- 需求类型（中文展示，如「找铺咨询」「设备出售」）、品类/设备、预算/价格、区域。
- 转让详情、设备详情。
- 用户上传图片缩略图和预览。
- 提交时间和简洁处理状态（已提交、已联系、已结束）。
- 编辑、删除操作（仅自己的线索）。

编辑页通过 `GET /api/leads/:id` 加载单条记录；删除调用 `DELETE /api/leads/:id`。

### 3.9 我的

功能：

- 查看/编辑称呼和手机号（用于表单自动填充）。
- 进入「我的咨询记录」。
- 进入「我的收藏项目」（须提示「收藏仅保存在本机」）。
- 查看隐私政策。
- 联系招商客服。
- 查看关于平台。

不应向普通商户暴露 CMS 管理后台地址。

### 3.10 隐私政策

独立页面，说明：

- 收集的信息类型（openid、称呼、手机号、经营意向、图片等）。
- 信息使用目的。
- 存储与保护方式。
- 用户查看/编辑/删除自己线索的权利。
- 第三方图片服务说明。
- 联系方式。

## 4. CMS 功能

Payload CMS 是唯一生产管理后台，以房源整理、修改和上下架为主线（详见 `docs/payload-admin-ux-audit.md`）。

### 4.1 后台结构与角色

侧栏入口：房源管理、咨询收件箱、设备供需、系统设置。

后台用户角色（`users.role`）：

| 角色 | 权限 |
|------|------|
| `admin` | 房源、咨询、设备、账号管理和永久删除 |
| `editor` | 房源上下架、咨询处理和设备发布 |

登录首页直接显示房源工作台，与房源集合列表使用同一界面。

### 4.2 Projects

维护招商铺位和转让机会。

关键字段：

- `opportunityType`: `leasing` 或 `transfer`
- 标题、学校、区域、地址、项目类型、面积、费用
- 适合/不适合业态
- 项目亮点、客群说明、合作方式、看铺安排
- `coverImage`（编辑页置顶）和 `images`
- 转让信息 `transferInfo`
- 状态、推荐、排序

业务规则：`online`、`coming`、`full` 为公开状态；上架前实时校验标题、封面、类型、区域、费用、客群说明和详情图片。

下拉选项与小程序对齐，统一维护于 `collections/shared/fieldOptions.ts`。

### 4.3 Leads

统一线索池。

关键字段：

- `leadType`
- `sourceChannel`
- `submitterOpenId`
- `project` / `projectTitle`
- `name` / `phone`
- `businessType`
- `budgetRange`
- `regionPreference`
- `hasCampusExperience`
- `transferDetails`
- `equipmentDetails`
- `renovationDetails`
- `attachments`
- `status`：`new`、`contacted`、`closed`
- `internalNote`：一条后台内部备注
- `generatedProject`：转让咨询生成的房源

收件箱只维护是否已联系和内部备注，具体沟通在微信或电话中完成。转让咨询可一次性生成房源草稿。

### 4.4 Media

用于项目图片和用户上传图片。

关键字段：

- `seedKey`
- `alt`
- `ownerOpenId`
- `source`: `seed_demo`、`lead_attachment`、`admin`
- `originalFilename`
- `compressedSize`

线索创建/更新时必须校验附件归属当前上传用户。

## 5. API 约定

小程序兼容 API：

| 方法 | 路径 | 认证 |
|------|------|------|
| POST | `/api/auth/wechat-login` | 否 |
| GET | `/api/projects` | 否 |
| GET | `/api/projects/:id` | 否（非 staff 仅公开项目） |
| POST | `/api/projects` | 后台 |
| PUT | `/api/projects/:id` | 后台 |
| DELETE | `/api/projects/:id` | 后台 |
| GET | `/api/leads` | 是 |
| GET | `/api/leads/:id` | 是 |
| POST | `/api/leads` | 是 |
| PUT | `/api/leads/:id` | 是 |
| DELETE | `/api/leads/:id` | 是 |
| GET | `/api/equipments` | 否 |
| POST | `/api/uploads/lead-image` | 是 |
| GET/PATCH | `/api/admin/properties` | 后台 |
| GET/PATCH | `/api/admin/inquiries` | 后台 |
| GET/PATCH | `/api/admin/equipment` | 后台 |
| POST | `/api/admin/inquiries/:id/create-property` | 后台 |

认证：

- `POST /api/auth/wechat-login` 返回 `{ token, openid, expiresAt, mode }`。
- 小程序调用线索和上传接口时带 `Authorization: Bearer <token>`。
- 未认证访问 `GET /api/leads` 返回 `401`。
- Token 过期时，客户端应清缓存并重新登录后重试；客户端在过期前 30 分钟会主动刷新 token。
- 生产环境 `WECHAT_AUTH_MODE=dev` 不可用；必须配置真实 `WECHAT_APPID` 与 `WECHAT_APP_SECRET`。

线索写入约束：

- `POST /api/leads` 固定 `status=new`，忽略客户端传入的 CRM 字段。
- `PUT /api/leads/:id` 仅接受用户可编辑字段。
- `attachments` 中的 media id 必须属于当前用户；`lead_attachment` 无归属或不匹配时拒绝，`seed_demo` / `admin` 来源禁止引用。
- `GET /api/projects/:id` 对小程序仅返回已公开且未驳回的项目；草稿项目对非 staff 返回 404。

响应约束：

- 不向小程序返回 `submitterOpenId`、`owner`、`closedAmount`、`lostReason` 等内部字段。
- 设备公开列表不返回姓名和手机号，并对区域/备注做截断。

上传：

- `/api/uploads/lead-image` 接收 multipart `file`，要求 Bearer Token；无效 token 返回 `401`。
- 后端限制图片类型和大小，压缩为 JPEG 后写入 `media`，并记录 `ownerOpenId`。
- 表单提交时传 `attachments: string[]`，数组元素为 media id。

## 6. 调试模式

### 6.1 小程序本地 mock

在 `mp/app.js`：

```js
useLocalMock: true
```

小程序不请求后端，使用本地 storage mock 数据。适合 UI 演示和前端离线开发。Mock 模式下的登录请求会发送 `X-Dev-OpenId`。

### 6.2 Payload CMS 联调

在 `mp/app.js`：

```js
apiUrl: 'http://127.0.0.1:3000/api',
useLocalMock: false,
devOpenId: 'dev-openid-local'
```

在 `backend/.env`：

```env
WECHAT_AUTH_MODE=dev
WECHAT_AUTH_DEV_OPENID=dev-openid-local
```

初始化数据：

```bash
pnpm backend:seed
```

### 6.3 根目录 mock 服务

```bash
pnpm dev
```

- Mock API: `http://localhost:5173/api`
- Mock admin: `http://localhost:5173/admin/index.html`

Mock 管理后台通过 `X-Admin-Access: local-admin` 获取全部线索；未携带该头且无 `phone` 参数时，`GET /api/leads` 返回 `401`。

### 6.4 微信生产模式

在生产环境：

```env
WECHAT_AUTH_MODE=wechat
WECHAT_APPID=your-wechat-appid
WECHAT_APP_SECRET=your-wechat-app-secret
```

小程序通过 `wx.login` 获取 code，后端调用微信 `jscode2session` 获取 openid。此时不应发送 `X-Dev-OpenId`。

## 7. 数据模型摘要

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
  projectType?: string;
  areaText?: string;
  feeText?: string;
  suitableBusiness?: string[];
  unsuitableBusiness?: string[];
  highlights?: string[];
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
  };
  status: 'draft' | 'online' | 'coming' | 'full' | 'offline';
  auditStatus: 'pending' | 'approved' | 'rejected';
  isRecommended: boolean;
  sort: number;
}

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
  transferDetails?: {
    locationText?: string;
    feeText?: string;
    transferFee?: string;
    remainingTerm?: string;
    includesEquipment?: boolean;
  };
  equipmentDetails?: {
    equipmentName?: string;
    specText?: string;
    equipmentCondition?: string;
    expectedPrice?: string;
  };
  attachments?: Array<{ id: string; url: string; alt?: string }>;
  remark?: string;
  status: string;
  follows?: FollowRecord[];
}
```

说明：`submitterOpenId` 仅存在于 CMS/数据库层，不出现在小程序 API 响应中。

## 8. 验证要求

- 小程序项目列表能从 CMS 或本地 mock 获取数据。
- 项目详情能展示多张真实图片并左右滑动。
- 找铺、转让、设备表单均能提交并在 CMS `leads` 中看到。
- 用户能编辑和删除自己的线索，无法操作他人线索。
- 转让和设备字段在 CMS 中以结构化字段展示，不只堆在备注里。
- 用户上传图片能进入 CMS `media`，线索中能看到附件。
- 附件 ID 归属校验生效，无法引用他人上传的图片。
- `dev-openid-local` 和其他 `devOpenId` 的历史记录相互隔离。
- 设备供需列表不展示联系方式，区域和备注已脱敏。
- 隐私政策页面可正常打开；首次提交表单须勾选同意。
- 咨询记录展示中文需求类型；收藏页提示「仅本机」。
- 首页推荐筛选、来源筛选、加载重试与下拉刷新行为正确。
- Payload 工作台、线索看板、快捷操作、角色权限可按预期使用。
- Token 过期后，小程序能自动重新登录并重试请求。
- `pnpm backend:lint` 和 `pnpm backend:build` 通过。
