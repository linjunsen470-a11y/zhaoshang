# Payload CMS 后台 — 编辑维护体验审计与实施记录

> 审计与实施日期：2026-06-22  
> 审计范围：`backend/` Payload CMS 管理后台  
> 审计视角：以招商顾问、内容编辑、平台管理员的日常维护动作为核心

---

## 一、用户角色与核心诉求

| 角色 | 日常任务 | 关键诉求 |
|------|---------|---------|
| 招商顾问 (`advisor`) | 处理新线索、跟进、约看、成交登记 | 快速看清待办、少点几步、电话/项目一键可达 |
| 内容编辑 (`editor`) | 维护项目信息、上传图片、上下线 | 字段含义清晰、与小程序展示一致、审核规则明确 |
| 平台管理员 (`admin`) | 用户管理、数据清理、权限分配 | 角色边界清楚、敏感操作可控 |

---

## 二、实施前主要问题

1. **英文 slug 直出：** 集合名、字段名、下拉 value 对非技术编辑不友好。
2. **跟进入口分散：** `follow-records` 独立集合，顾问需在多个页面间跳转。
3. **线索列表信息密度低：** 默认列未突出状态、负责人、下次跟进等 CRM 关键字段。
4. **项目与小程序脱节：** 编辑项目时不知道小程序详情页路径，难以预览核对。
5. **线索与商户档案割裂：** 多次咨询的商户无法沉淀为可复用档案。
6. **无运营总览：** 登录后直接进入空仪表盘，缺少「今天该干什么」的指引。
7. **权限粗放：** 所有登录用户权限相同，编辑可能误改线索 CRM 字段。

---

## 三、分阶段实施记录

### 第一阶段：基础可用性（commit `6402d99`）

| 改进项 | 说明 |
|--------|------|
| 侧栏中文化与分组 | `业务运营` / `客户资产` / `系统设置` |
| 统一字段选项 | `collections/shared/fieldOptions.ts` 与小程序下拉对齐 |
| 隐藏 `follow-records` | 侧栏不可见；说明引导至线索详情「跟进历史」 |
| Projects 优化 | 封面图置顶；新建默认 `auditStatus=pending`；未通过审核不可上线 |
| Leads 列表优化 | 默认列含状态、负责人、项目、下次跟进 |
| 跟进时间线组件 | `LeadFollowTimeline` 在线索详情内添加跟进，同步 `status` / `nextFollowAt` |

### 第二阶段：顾问效率（commit `f98ee95`）

| 改进项 | 说明 |
|--------|------|
| 运营工作台 | `OperationsDashboard` 展示新线索、逾期待跟进、在线项目等 |
| 线索快捷操作 | `LeadQuickActions`：复制电话、打开关联项目、转项目 |
| 项目编辑提示 | `ProjectEditHints` 显示小程序详情路径 |
| 负责人关联 | `owner` 字段关联 `users`，不再手填文本 |
| 转项目 API | `POST /api/leads/:id/convert` 供 CMS 快捷操作调用 |

### 第三阶段：流程闭环（commit `f38e732`）

| 改进项 | 说明 |
|--------|------|
| 线索看板 | `LeadsKanbanView` at `/admin/collections/leads/kanban`，拖拽改状态 |
| 商户档案打通 | `POST /api/leads/:id/sync-merchant` 沉淀档案；`leads.merchantProfile` 双向关联 |
| 档案关联面板 | `MerchantProfileLeadsPanel` 在商户档案页展示相关线索 |
| 角色权限 | `admin` / `advisor` / `editor`，`collections/shared/access.ts` 统一校验 |

---

## 四、自定义组件索引

路径：`backend/app/admin/components/`

| 组件 | 挂载位置 | 功能 |
|------|---------|------|
| `OperationsDashboard` | `payload.config.ts` → `admin.components.beforeDashboard` | 登录后运营统计与快捷入口 |
| `LeadsKanbanView` | `Leads` → `admin.components.views.kanban` | 看板视图 |
| `LeadQuickActions` | `Leads` 详情 UI 字段 | 复制电话、转项目、同步档案等 |
| `LeadFollowTimeline` | `Leads` 详情标签页 | 内联跟进历史 |
| `ProjectEditHints` | `Projects` 详情 UI 字段 | 小程序路径提示 |
| `MerchantProfileLeadsPanel` | `MerchantProfiles` 详情 UI 字段 | 关联线索列表 |

组件注册文件：`backend/app/admin/[[...segments]]/importMap.js`

---

## 五、角色权限矩阵

| 能力 | admin | advisor | editor |
|------|:-----:|:-------:|:------:|
| 管理项目 | ✅ | ✅ | ✅ |
| 管理媒体 | ✅ | ❌ | ✅ |
| 管理线索 | ✅ | ✅ | ❌ |
| 管理商户档案 | ✅ | ✅ | ❌ |
| 删除线索 | ✅ | ❌ | ❌ |
| 管理后台用户 | ✅ | ❌ | ❌ |

实现：`backend/collections/shared/access.ts`

---

## 六、新增/强化的 API

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/leads/:id/convert` | 将线索转为 `projects` 记录 |
| POST | `/api/leads/:id/sync-merchant` | 按线索联系方式与需求沉淀 `merchant-profiles` |

以上接口供 CMS 内快捷操作使用，**不应对小程序客户端开放**。

---

## 七、数据库与部署提示

- Schema 变更后执行：`pnpm --dir backend exec tsx scripts/push-schema.ts`
- 或设置 `PAYLOAD_DB_PUSH=true`（Docker 构建已默认启用）
- 新增字段包括 `leads.merchantProfile`、`merchant-profiles.relatedLeads`、`users.role` 等

---

## 八、顾问典型工作流（实施后）

```text
登录 → 运营工作台看待办
     → 打开线索看板拖拽状态 / 或进列表处理新线索
     → 线索详情：复制电话 → 添加跟进 → 设下次跟进时间
     → 有意向：打开关联项目 / 转项目上线
     → 老客户：同步商户档案，便于下次快速识别
```

---

## 九、后续可优化项

| 优先级 | 建议 |
|--------|------|
| P1 | 看板列内搜索与负责人筛选 |
| P1 | 工作台点击统计数字直达预筛选列表 |
| P2 | 项目预览二维码（小程序码） |
| P2 | 跟进提醒（邮件/企业微信，需外部集成） |
| P2 | 批量分配负责人、批量改状态 |

---

## 十、相关提交

| Commit | 说明 |
|--------|------|
| `6402d99` | Improve Payload admin UX for editors (phase 1) |
| `f98ee95` | Improve Payload admin UX phase 2: dashboard and lead actions |
| `f38e732` | Improve Payload admin UX phase 3: kanban, merchants, roles |