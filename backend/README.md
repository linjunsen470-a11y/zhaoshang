# Payload Backend

Payload CMS 3 + Next.js 16 + PostgreSQL backend for campus and commercial listings.

当前 demo 状态与验证限制见 [2026-10-16 审计](../docs/demo-prelaunch-audit-2026-10-16.md)。命令均在仓库根目录执行。

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

Payload `db push` can hang on interactive enum rename prompts leftover from the old CRM. For lead dual-view fields use the non-interactive helper:

```bash
pnpm --dir backend schema:ensure-leads
```

Full Payload push (choose **create** for new enums, not rename). Back up the target database first and run explicitly from the maintenance environment:

```bash
pnpm --dir backend schema:push
```

Compose 仅提供后端，没有 `db`、`migrate` 服务或 `schema` profile；数据库由 `DATABASE_URI` 指向外部 PostgreSQL。正常启动及镜像构建保持 `PAYLOAD_DB_PUSH=false`。

Schema 入口统一为 `scripts/push-schema.ts`。`public/.gitkeep` 保留静态资源目录，供新检出和 Docker 构建使用；默认 Next 示例图已清理。临时验证文件与本机配置遵循根目录 `.gitignore`。

商业字段与 Payload 认证字段升级分别见 [商业迁移说明](../docs/商业项目接入-迁移与发布说明.md) 和根目录 [README](../README.md#验证)。

## Migration from the retired CRM admin

```bash
pnpm --dir backend migrate:property-cms
pnpm --dir backend schema:ensure-leads
```

The migrate command creates timestamped backup tables and maps legacy states. Prefer `schema:ensure-leads` over interactive `push-schema` when only lead columns are missing.

## Security

- Mini-program inquiry CRUD requires a signed bearer token and validates `submitterOpenId` ownership.
- Attachment IDs are ownership-checked before they are linked to inquiries.
- Public equipment images are served only when the parent equipment inquiry has been reviewed and published.
- Transfer inquiry attachments may prefill a draft, but public properties must replace them with staff-reviewed media before publishing.
- Public submissions and uploads use lightweight per-IP/per-openid rate limits; use a shared limiter if the service scales to multiple instances.
- Public property reads only expose `online`, `coming`, and `full` records; child units also require a public parent project.
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
