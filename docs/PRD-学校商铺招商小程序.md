# 学校商铺招商系统 功能需求文档 (PRD)

## 1. 项目概述
本项目是一个学校商铺招商系统，包含**微信小程序用户端**与**Web管理端后台**。
- **小程序用户端**：面向餐饮、零售、服务类商户老板，展示学校食堂档口、校园商业街等招商项目，支持搜索、筛选、详情浏览、我要咨询（提交意向线索）等功能。
- **Web管理端后台**：面向招商运营团队，提供数据看板、项目管理（新增/编辑/上架/下架）、咨询管理（分配/跟进/状态修改）及跟进记录等功能。

### 核心业务闭环
```
[小程序端] 浏览/搜索项目 -> 查看详情 -> 提交咨询表单
                                      | (通过 API 实时同步)
                                      v
[Web 管理端] 自动生成线索 -> 招商经理跟进 -> 记录沟通内容 -> 变更状态直至成交/关闭
```

---

## 2. 系统角色与核心流程

### 2.1 普通用户 (商户老板)
主要在手机微信端使用，通过小程序完成以下操作：
1. **浏览与搜索项目**：根据学校、区域、业态快速检索。
2. **筛选项目**：支持按区域、项目类型、投资预算、适合业态等条件精细化筛选。
3. **查看项目详情**：查看图文详情、合作方式、亮点及客群说明。
4. **提交咨询**：在线填写联系人、电话、经营品类、预算等表单。
5. **我的咨询**：查看提交历史及当前招商人员的跟进状态。

### 2.2 管理员 (招商运营人员)
主要在宽屏浏览器中使用 Web 后台，完成以下操作：
1. **数据看板**：直观查看项目总数、新增咨询数、待跟进线索数及热门排行。
2. **项目管理**：发布新铺位、上传封面与详情图、设为推荐、上下架项目。
3. **咨询跟进**：查看所有线索，变更状态（如：已联系、谈判中、已成交），添加详细的跟进记录。

---

## 3. 功能模块详情

### 3.1 小程序用户端页面 (手机端)
1. **首页 (Home)**
   - 顶部搜索框：支持检索学校、区域、适合业态。
   - 分类快捷入口：食堂档口、校园商业街、快餐小吃、奶茶咖啡、便利零售、校园服务、低预算项目、热门项目。
   - 推荐项目与最新项目卡片式列表。
2. **项目列表页 (List)**
   - 条件筛选栏：包含区域、项目类型、预算区间、适合业态、项目状态。
   - 支持实时关键字过滤。
3. **项目详情页 (Detail)**
   - 多图轮播与醒目的招商状态（招商中、即将开放、已满租）。
   - 基础参数：学校名称、面积、租金/费用说明、适合与不适合业态。
   - 核心详情：项目亮点、合作方式、看铺安排、客群说明。
   - 底部悬浮动作条：电话联系顾问、收藏项目、我要咨询。
4. **咨询提交页 (Apply)**
   - 智能联动：从特定项目详情点击进入时，自动回填意向项目。
   - 表单字段：称呼（必填）、手机号（必填+校验）、经营品类（必选）、投资预算（必选）、意向区域（可选）、是否有经验（可选）、备注（可选）。
5. **提交成功页 (Success)**
   - 友好提示文案，并提供“返回首页”、“查看更多”和“拨打电话”按钮。
6. **我的页面 (My)**
   - 用户头像、昵称展示。
   - “我的咨询”与“我的收藏”快捷通道。

### 3.2 Web 管理端后台 (PC 浏览器端)
1. **登录页**：管理员账号密码安全登录。
2. **数据看板 (Dashboard)**
   - 关键指标卡片：项目总数、招商中项目数、待跟进线索数、今日新增咨询、本月新增咨询等。
   - 数据图表（可用 CSS/HTML 模拟简洁美观的统计卡片）。
3. **项目管理页 (Project Management)**
   - 项目列表：包含状态过滤、推荐状态切换、快捷上下架、编辑和删除按钮。
   - 新增/编辑表单：支持所有项目字段的配置，包括上传多图（Mock）和排序值设定。
4. **咨询管理与详情页 (Leads Management)**
   - 咨询线索列表：支持搜索称呼/手机号，按状态和项目进行筛选。
   - 跟进操作区：点击任意线索，可直接在详情中添加跟进记录（写实描述）、修改客户跟进状态（新咨询 -> 已联系 -> 已看铺 -> 谈判中 -> 已成交/无效/暂缓）。

---

## 4. 基础数据模型定义

### 4.1 项目 (Project)
```ts
interface Project {
  id: string;
  title: string;              // 项目标题
  city: string;               // 城市
  district: string;           // 区域
  addressText?: string;       // 详细地址
  schoolName?: string;        // 学校名称
  schoolAlias?: string;       // 学校简称
  showFullSchoolName?: boolean;// 是否显示完整学校名称
  projectType: string;        // 项目类型
  areaText: string;           // 面积范围
  feeText: string;            // 费用说明
  suitableBusiness: string[]; // 适合业态
  unsuitableBusiness?: string[];// 不适合业态
  highlights: string[];       // 项目亮点
  customerInfo?: string;      // 客群说明
  cooperationMode?: string;   // 合作方式
  viewingTimeText?: string;   // 看铺安排
  coverImage?: string;        // 封面图 URL
  images: string[];           // 详情轮播图
  status: 'draft' | 'online' | 'coming' | 'full' | 'offline'; // 状态
  isRecommended: boolean;     // 是否推荐
  sort: number;               // 排序权重
  remark?: string;            // 备注
  createdAt: number;
  updatedAt: number;
}
```

### 4.2 咨询线索 (Lead)
```ts
interface Lead {
  id: string;
  projectId?: string;         // 关联项目 ID
  projectTitle?: string;      // 关联项目名称
  name: string;               // 称呼
  phone: string;              // 手机号
  businessType: string;       // 经营品类
  budgetRange: string;        // 投资预算
  regionPreference?: string;  // 意向区域
  hasCampusExperience?: boolean;// 是否有校园经验
  remark?: string;            // 备注内容
  status: 'new' | 'contacted' | 'interested' | 'viewing_scheduled' | 'viewed' | 'negotiating' | 'closed' | 'invalid' | 'paused';
  followUserId?: string;      // 跟进人 ID
  followUserName?: string;    // 跟进人姓名
  createdAt: number;
  updatedAt: number;
}
```

### 4.3 跟进记录 (FollowRecord)
```ts
interface FollowRecord {
  id: string;
  leadId: string;             // 关联咨询 ID
  content: string;            // 跟进记录内容
  nextFollowAt?: number;      // 下次跟进时间
  operatorId?: string;
  operatorName?: string;      // 操作人
  createdAt: number;
}
```

---

## 5. 开发里程碑与任务清单 (第一版核心闭环)
我们将按照开发规范，优先建立数据模型与共享 API 机制，再分别开发双端并进行联调。

1. **第一阶段：后端 mock 服务搭建**
   - 建立 `/server.js` 统一处理 API 请求与静态资源托管。
   - 设计初始化 mock 数据库 `data.json`（包含演示项目、演示咨询数据）。
2. **第二阶段：小程序端开发 (`/mp`)**
   - 初始化小程序全局配置 (`app.json`, `app.wxss`, `app.js`)。
   - 开发基础 API 交互层 (`/services/api.js`)。
   - 实现首页、项目列表、项目详情、咨询提交及成功页、我的咨询等页面。
3. **第三阶段：Web管理端后台开发 (`/admin`)**
   - 搭建精美、高端视觉效果的 Web 管理后台 SPA 页面。
   - 实现登录与数据看板。
   - 实现项目增删改查及上下架。
   - 实现咨询列表展示、跟进状态修改及添加跟进记录。
4. **第四阶段：联调与优化**
   - 小程序端与 Web 管理端联调数据通信。
   - 完善体验、表单正则校验及样式细节打磨。
