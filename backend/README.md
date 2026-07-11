# Payload Backend

Payload CMS 3 + Next.js 16 + PostgreSQL backend for the campus shop platform.

## Admin

Payload is the only admin interface. Workspace entry points:

| 模块 | URL |
|------|-----|
| 房源管理 | `/admin`（完整编辑仍走 `/admin/collections/projects/:id`） |
| 咨询收件箱 | `/admin/workspace/inquiries`（`?category=property\|equipment\|renovation`） |
| 系统设置 | `/admin/workspace/system` |

设备是否进入小程序公开列表：在咨询详情「处理编辑 → 设备公开设置」中配置（不再单独占侧栏入口）。

- Property workspace: URL-backed filters, table, quick-edit drawer, bulk publish controls.
- Inquiry inbox: three handling states and one internal note; no CRM timeline or assignment workflow.
- Equipment workspace: independent public status and public description.
- Roles: `admin` and `editor`.
- Primary list for consultations is `/admin/workspace/inquiries`; 「完整详情」opens `/admin/collections/leads/:id`.
- Custom workspace routes use `*Route` wrappers + `AdminWorkspaceShell` so Payload nav/account chrome is present.

Custom components are under `app/admin/components/`. Data models remain `projects`, `leads`, `media`, and `users` so mini-program API routes stay stable.

## Development

```bash
cp backend/.env.example backend/.env
docker compose up -d db
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

Full Payload push (choose **create** for new enums, not rename):

```bash
pnpm --dir backend schema:push
```

## Migration from the retired CRM admin

```bash
pnpm --dir backend migrate:property-cms
pnpm --dir backend schema:ensure-leads
```

The migrate command creates timestamped backup tables and maps legacy states. Prefer `schema:ensure-leads` over interactive `push-schema` when only lead columns are missing.

## Security

- Mini-program inquiry CRUD requires a signed bearer token and validates `submitterOpenId` ownership.
- Attachment IDs are ownership-checked before they are linked to inquiries.
- Public property reads only expose `online`, `coming`, and `full` records.
- Admin APIs use the Payload session through `getAuthenticatedStaff()`.
- Only `admin` can manage accounts or permanently delete content.
- `PAYLOAD_SECRET` is mandatory in production; production WeChat auth must use `WECHAT_AUTH_MODE=wechat`.

## Verification

```bash
pnpm backend:lint
pnpm --dir backend test:cms
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
pnpm backend:build
```
