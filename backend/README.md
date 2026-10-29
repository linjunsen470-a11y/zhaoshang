# Payload Backend

Payload CMS 3 + Next.js 16 + PostgreSQL backend for campus and commercial listings.

当前文档入口见 [文档索引](../docs/README.md)。命令均在仓库根目录执行。

2026-10-29 同步修复新增紧急停显、来源元数据和地区枚举；2026-10-30 已移除历史分类标记及旧格式转换。数据库结构尚未同步，运行前按 [初始化说明](../docs/schema-setup.md) 准备环境；腾讯视图筛选仍待完成。详见 [同步修复记录](../docs/tencent-sync-fixes-2026-10-29.md)。

## Admin

Payload is the only admin interface. Workspace entry points:

| 模块 | URL |
|------|-----|
| 运营工作台 | `/admin`（日常入口 + 待联系咨询） |
| 项目与铺位 | `/admin/collections/projects` |
| 咨询收件箱 | `/admin/workspace/inquiries` |
| 系统设置 | `/admin/workspace/system` |

设备是否进入小程序公开列表：在咨询详情「处理编辑 → 设备公开设置」中配置。

分享素材 `/admin/workspace/share`、上架检查 `/admin/workspace/quality` 从项目列表工具区进入；项目相关页面的导航会显示这两个次级入口。操作说明见 [CMS 上手指南](../docs/payload-cms-quickstart.md)。

- Property workspace: URL-backed filters, table, quick-edit drawer, bulk publish controls.
- Inquiry inbox: three handling states and one internal note; both are always visible in the detail sidebar. “已结束” means no further follow-up, not a completed transaction.
- Equipment workspace: independent public status and public description.
- Roles: `admin` and `editor`.
- Primary list for consultations is `/admin/workspace/inquiries`; 「完整详情」opens `/admin/collections/leads/:id`.
- Custom workspace routes use `*Route` wrappers + `AdminWorkspaceShell` so Payload nav/account chrome is present.

Custom components are under `app/admin/components/`. Data models remain `projects`, `leads`, `media`, and `users` so mini-program API routes stay stable.

## Development

```bash
cp backend/.env.example backend/.env
# 填写 backend/.env 的 DATABASE_URI，连接事先准备好的 PostgreSQL
# 仅首次空库初始化；已有库先备份并按迁移说明处理
pnpm --dir backend schema:push
pnpm dev
```

URLs:

- Admin: `http://localhost:3000/admin`
- Website: `http://localhost:3000`
- Payload REST: `http://localhost:3000/api/payload/...`
- Mini-program API: `http://localhost:3000/api/projects`

Seed demo data:

```bash
pnpm backend:seed
```

## Schema maintenance

只维护当前 Schema，数据库初始化统一使用 `pnpm --dir backend schema:push`。不再提供旧 CRM、账号字段或商业字段转换脚本。已有本机数据先备份，正常启动保持 `PAYLOAD_DB_PUSH=false`。

Compose 仅提供后端，连接外部 PostgreSQL；详细步骤见 [数据库初始化](../docs/schema-setup.md)。

## Security

- Mini-program inquiry CRUD requires a signed bearer token and validates `submitterOpenId` ownership.
- Attachment IDs are ownership-checked before they are linked to inquiries.
- Public equipment images are served only when the parent equipment inquiry has been reviewed and published.
- Transfer inquiry attachments may prefill a draft, but public properties must replace them with staff-reviewed media before publishing.
- Public submissions and uploads use lightweight per-IP/per-openid rate limits; use a shared limiter if the service scales to multiple instances.
- Public property reads only expose `online`, `coming`, and `full` records without emergency hiding; child units also require a public parent project without emergency hiding.
- Admin APIs use the Payload session through `getAuthenticatedStaff()`.
- Only `admin` can manage accounts or permanently delete content.
- `PAYLOAD_SECRET` is mandatory in production; production WeChat auth must use `WECHAT_AUTH_MODE=wechat`.
- `MINIPROGRAM_TOKEN_SECRET` is mandatory in production and must differ from `PAYLOAD_SECRET`.

## Verification

```bash
pnpm backend:lint
pnpm test:ci
pnpm --dir backend test:cms
pnpm backend:build
```

构建包含 TypeScript 检查。真实 HTTP、商业数据库和迁移测试需要隔离测试库；`test:ci` 默认跳过 HTTP 契约。不得用业务数据库替代测试库。
