# Repository Guidelines

## Project Structure & Module Organization

This repository has four main surfaces:

- `mp/`: WeChat mini-program client. Pages live in `mp/pages/<page>/` with matching `.js`, `.wxml`, `.wxss`, and `.json` files. Shared API calls are in `mp/services/api.js`; client constants are in `mp/config.js`; shared form helpers are in `mp/utils/form.js`; images are in `mp/images/`. Core user flows include finding campus shops, submitting transfer/equipment leads, viewing/editing/deleting own consultation history, and reading the privacy policy.
- `backend/`: Payload CMS + Next.js backend and public website. App routes are in `backend/app/`, collections in `backend/collections/`, CMS configuration in `backend/payload.config.ts`, and admin UI extensions in `backend/app/admin/components/`. Shared field labels/options live in `backend/collections/shared/fieldOptions.ts`; role-based access helpers live in `backend/collections/shared/access.ts`. Mini-program APIs and shared auth/sanitization helpers are in `backend/app/api/`.
- Root mock tooling: `server.js` runs the local Mock API and `data.json` stores mock data. The static `admin/` UI has been retired; Payload is the only admin.
- Deployment tooling: `docker-compose.yml`, root `.env.example`, `backend/Dockerfile`, and `backend/.env.example` support production builds.

Docs belong in `docs/`, including `docs/miniprogram-ux-audit.md` and `docs/payload-admin-ux-audit.md`. Deployment configuration is in `docker-compose.yml` and `.env.example`; `.github/workflows/ci.yml` and `deploy/deploy.sh` manage CI and deployment. `.workflow/gitee-verify.yml` is a manual image-build verification workflow; GitHub remains the primary repository. See `docs/ci-deployment.md`.

## Build, Test, and Development Commands

- `pnpm dev`: starts the Next/Payload backend.
- `pnpm mock:api`: starts the root `server.js` Mock API.
- `pnpm backend:dev`: starts the Next/Payload backend from the repository root.
- `pnpm backend:build`: builds the backend from the repository root.
- `pnpm backend:lint`: runs backend ESLint from the repository root.
- `pnpm --dir backend install`: installs backend dependencies using the lockfile.
- `docker compose up -d`: starts the cloud stack from immutable images; includes a private `db` service. CI builds and publishes images before SSH deployment.
- `pnpm test:ci`: runs client/backend unit tests; real HTTP contracts require explicit isolated-environment configuration.

Open the mini-program with WeChat DevTools using `mp/project.config.json`.

## Coding Style & Naming Conventions

This project is not launched. Maintain only the current schema and API contract; do not introduce historical field/status adapters, old-response fallbacks, or automatic old-data repair. Keep explicit schema setup, access control, and runtime error handling. Demo data and its temporary backups need not be retained; use appropriate backup practices for real or production data.

Use JavaScript modules at the root and in `mp/`; use TypeScript in `backend/`. Follow the existing 2-space indentation style and keep semicolons consistent with nearby files. Name mini-program pages by route directory, such as `pages/detail/detail.js`. Name Payload collection files with PascalCase, for example `Projects.ts`.

Choose backend checks according to the scope and risk of the change. Keep client API logic centralized in `mp/services/api.js` rather than duplicating request code in pages. The develop mini-program currently connects to the Tencent HTTPS API. Configure environments only in `mp/config/environments.js`; local mock requires explicit `useLocalMock: true`.

For lead-related backend changes:

- Use `sanitizeLeadCreateInput()` for `POST /api/leads`.
- Use `sanitizeLeadUpdateInput()` for `PUT /api/leads/:id`.
- Validate attachment ownership with `validateAttachmentOwnership()` before persisting attachments.
- Do not expose `submitterOpenId` or CRM-only fields in `mapLead()` responses.

For Payload admin UX changes:

- Register custom admin components in `backend/app/admin/components/` and wire them through `backend/app/admin/[[...segments]]/importMap.js`.
- Custom workspace views belong under `admin.components.views` with a `path` (e.g. `/workspace/inquiries`). Primary nav routes:
  - 运营工作台: `/admin`（日常入口 + 待联系咨询；dashboard 勿再包 AdminWorkspaceShell）
  - 项目与铺位: `/admin/collections/projects`
  - 咨询收件箱: `/admin/workspace/inquiries`
  - 项目工具（次级入口）: 分享素材 `/admin/workspace/share`、上架检查 `/admin/workspace/quality`；从项目列表或项目相关页面的次级导航进入
  - 系统: `/admin/workspace/system`
  - 聚合数据: `GET /api/admin/ops-workbench`；咨询快捷改状态: `PATCH /api/admin/inquiries`
- Workspace custom views (`/workspace/*`) must use `*Route` server components that wrap content with `AdminWorkspaceShell` (`DefaultTemplate`), otherwise the Payload nav/account chrome is missing.
- Lead detail has two layers: `customerSnapshot` (immutable original) and editable working fields under the「处理编辑」tab. Populate snapshot on create via `buildLeadSnapshot`; never overwrite on update.
- Keep consultation handling status and internal note in the detail sidebar. “已结束” does not mean “成交”; equipment publication remains an independent state. Project editing uses the native save button plus status selection; do not add another competing publish/save flow.
- Keep `leads`, `projects`, `users`, and `media` visible so native document routes work (e.g. 「完整详情」→ `/admin/collections/leads/:id`). Hide default Payload nav groups via `admin-theme.css`; PrimaryNav is the IA.
- Keep dropdown labels/options aligned with the mini-program via `backend/collections/shared/fieldOptions.ts`.
- Staff roles are `admin` and `editor`; enforce permissions through `backend/collections/shared/access.ts`.

Schema changes against Postgres must run explicitly via `backend/scripts/push-schema.ts` after backup. Temporary demo backups may be removed after verification. Keep `PAYLOAD_DB_PUSH=false` during normal startup and production image builds.

## Testing Guidelines

Favor rapid iteration. Select the smallest meaningful verification that covers the changed behavior and its risks; do not run the full test suite, production build, or complete E2E journey after every small feature or copy/layout change. Documentation-only edits generally need no tests; mini-program template or style edits can use `node scripts/mp-check-templates.mjs` and a focused page check when useful. Use targeted tests for affected backend, client, or admin behavior; expand validation for authentication, permissions, schema/data changes, release preparation, failures, or other material risks. Existing commands such as `pnpm backend:lint`, `pnpm test:ci`, `pnpm --dir backend test:cms`, and `pnpm backend:build` remain available when warranted. Real HTTP/database tests must use an isolated test environment. Distinguish skipped or unavailable E2E checks from passing tests.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add lead status validation` or `Fix mini-program detail loading`. Keep commits focused by area.

Pull requests should include a brief summary, affected areas (`mp`, `backend`, `admin`, or deployment), validation steps run, linked issues if any, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit real secrets. Copy `.env.example` to `.env` for deployment settings, set a strong `PAYLOAD_SECRET`, and use a real HTTPS `PAYLOAD_PUBLIC_SERVER_URL` in production. Commit env examples, lockfiles, Dockerfiles, and compose files; do not commit `.env`, `.next/`, `node_modules/`, upload folders, or logs.

Additional security expectations:

- `GET /api/leads` must not return all leads without authentication.
- Mini-program lead updates must not accept CRM fields from the client.
- Uploaded media IDs must be ownership-checked before being attached to leads. `lead_attachment` media must belong to the current user; `seed_demo` and `admin` media must be rejected.
- `GET /api/projects/:id` must not expose draft or rejected projects to non-staff callers.
- Staff-only routes (`POST/PUT/DELETE /api/projects`, `/api/stats`, `/api/admin/*`) must use `getAuthenticatedStaff()`, not the mini-program bearer token.
- Production must use `WECHAT_AUTH_MODE=wechat`; do not rely on `X-Dev-OpenId` outside local mock mode.
- `PAYLOAD_SECRET` is required in production.
- `server.js` and its development OpenID mechanism are local Mock tooling only; do not use them as a production auth pattern.
- Keep advisor phone and form length limits centralized in `mp/config.js`.
