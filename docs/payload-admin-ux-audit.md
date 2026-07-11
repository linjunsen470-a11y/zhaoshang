# Payload CMS 房源后台重做记录

> 实施日期：2026-07-11
> 核心目标：快速整理、修改和上架房源；CRM 不再是后台主线。

## 新信息架构

1. `房源管理`：登录首页 `/admin`；完整编辑使用 Payload 原生文档路由 `/admin/collections/projects/:id`。
2. `咨询收件箱`：自定义视图 `/admin/workspace/inquiries`（`leads` 集合保持 `admin.hidden`，避免集合 List 404）。
3. `设备供需`：自定义视图 `/admin/workspace/equipment`。
4. `系统设置`：自定义视图 `/admin/workspace/system`；账号与媒体分别打开 `/admin/collections/users`、`/admin/collections/media`。

> **路由说明（Payload 3）**：`admin.hidden: true` 的集合不会出现在 `visibleEntities` 中，访问 `/admin/collections/<slug>` 列表/文档页会 404。因此仅咨询列表用自定义 workspace 路径；`projects` / `users` / `media` 保持可见以便原生编辑，侧边栏默认集合分组由 CSS 隐藏，主导航使用 `PrimaryNav`。

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
