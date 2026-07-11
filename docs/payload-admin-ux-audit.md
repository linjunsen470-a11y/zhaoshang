# Payload CMS 房源后台重做记录

> 实施日期：2026-07-11
> 核心目标：快速整理、修改和上架房源；CRM 不再是后台主线。

## 新信息架构

1. `房源管理`：登录首页 `/admin`；完整编辑使用 Payload 原生文档路由 `/admin/collections/projects/:id`。
2. `咨询收件箱`：自定义视图 `/admin/workspace/inquiries`；完整详情 `/admin/collections/leads/:id`（设备公开状态在详情「处理编辑」中配置，不再单独占侧栏）。
3. `系统设置`：自定义视图 `/admin/workspace/system`；账号与媒体分别打开 `/admin/collections/users`、`/admin/collections/media`。

> **路由说明（Payload 3）**：多段自定义 admin view（如 `/workspace/*`）默认不会设置 `templateType: 'default'`，会丢失侧栏与账号菜单。本项目用 `AdminWorkspaceShell` + `*Route` 组件显式包裹 `DefaultTemplate`。`admin.hidden: true` 的集合文档页也会 404，因此 `leads` / `projects` / `users` / `media` 均保持可见；默认集合导航由 CSS 隐藏，主导航使用 `PrimaryNav`。

旧静态 Mock 后台、角色化 V2 工作台、领取池、看板、团队负载、商户档案和跟进时间线均已移除。

## 房源工作流

```text
登录 → 房源列表 → 搜索/筛选
     → 快速修改标题、区域、面积、费用、推荐、排序或状态
     → 需要图片/完整文案时进入完整编辑页
     → 通过发布检查后直接上架
```

房源状态保持 `draft / online / coming / full / offline`。`online`、`coming`、`full` 会公开展示；上架前必须具备标题、封面、房源类型、区域、费用、客群说明和详情图片。

审核状态、持久化完整度、负责人、顾问提示、人流标签和设施标签已经删除。完整度改为实时计算，不再形成第二套状态。

## 咨询与设备

### 信息架构

| 入口 | 用途 |
|------|------|
| 咨询收件箱 | 统一处理客户提交：业务线分段 **全部 / 房源 / 设备 / 装修**；设备公开在详情内配置 |
| 房源管理 | 房源 CRUD 与上下架，与咨询收件分离 |

### 详情双版本

- **客户原文**（`customerSnapshot` JSON）：创建时锁定，后台不可覆盖；历史数据首次保存时按当时库中内容回填一次。
- **处理编辑**：可改字段、状态、内部备注、设备公开设置；不影响原文快照。
- 顶部 **联系条**（`InquiryContactBar`）：大号电话、复制、关联房源、转让生成草稿。

### 规则

- 咨询状态只有 `new / contacted / closed`。
- 小程序显示“已提交 / 已联系 / 已结束”，不再展示跟进时间线。
- 具体沟通以微信或电话为准。
- 转让咨询可一次性生成房源草稿，生成后记录关联房源并阻止重复生成。
- 设备公开状态为 `draft / online / offline`，不依赖咨询处理状态。

## 权限

| 能力 | admin | editor |
|------|:-----:|:------:|
| 整理和上下架房源 | ✅ | ✅ |
| 处理咨询 | ✅ | ✅ |
| 发布设备 | ✅ | ✅ |
| 管理账号 | ✅ | ❌ |
| 永久删除 | ✅ | ❌ |

## 视觉规则

- 主按钮：深蓝背景、白色文字。
- 普通按钮：白/灰背景、深色文字。
- 危险按钮：红色描边或红底白字。
- 浅色与深色主题均显式设置按钮文字颜色。
- 所有筛选反映到 URL；表单控件有标签；异步反馈使用 `aria-live`；抽屉阻止背景滚动；减少动效设置得到尊重。

## 迁移

```bash
pnpm --dir backend migrate:property-cms
pnpm --dir backend exec tsx scripts/push-schema.ts
```

迁移脚本先在独立 `cms_backup` schema 中创建时间戳备份表，再在事务中完成状态映射。Schema push 后旧商户档案、跟进记录和高级 CRM 字段不再可用。
