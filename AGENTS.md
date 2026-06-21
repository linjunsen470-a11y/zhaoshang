# Repository Guidelines

## Project Structure & Module Organization

This repository has four main surfaces:

- `mp/`: WeChat mini-program client. Pages live in `mp/pages/<page>/` with matching `.js`, `.wxml`, `.wxss`, and `.json` files. Shared API calls are in `mp/services/api.js`; client constants are in `mp/config.js`; shared form helpers are in `mp/utils/form.js`; images are in `mp/images/`. Core user flows include finding campus shops, submitting transfer/equipment leads, viewing/editing/deleting own consultation history, and reading the privacy policy.
- `backend/`: Payload CMS + Next.js backend and public website. App routes are in `backend/app/`, collections in `backend/collections/`, CMS configuration in `backend/payload.config.ts`, and admin UI extensions in `backend/app/admin/components/`. Shared field labels/options live in `backend/collections/shared/fieldOptions.ts`; role-based access helpers live in `backend/collections/shared/access.ts`. Mini-program compatibility APIs and shared auth/sanitization helpers are in `backend/app/api/`.
- Root mock/admin tooling: `server.js` runs the local Node server, `admin/` contains the static admin UI, and `data.json` stores mock data.
- Deployment tooling: `docker-compose.yml`, root `.env.example`, `backend/Dockerfile`, and `backend/.env.example` support production builds.

Docs belong in `docs/`, including `docs/miniprogram-ux-audit.md` and `docs/payload-admin-ux-audit.md`. Deployment configuration is in `docker-compose.yml` and `.env.example`.

## Build, Test, and Development Commands

- `pnpm dev`: starts the root `server.js` mock API/admin workflow.
- `pnpm backend:dev`: starts the Next/Payload backend from the repository root.
- `pnpm backend:build`: builds the backend from the repository root.
- `pnpm backend:lint`: runs backend ESLint from the repository root.
- `pnpm --dir backend install`: installs backend dependencies using the lockfile.
- `docker compose up -d --build`: from the root, builds and starts the Payload service plus Postgres.

Open the mini-program with WeChat DevTools using `mp/project.config.json`.

## Coding Style & Naming Conventions

Use JavaScript modules at the root and in `mp/`; use TypeScript in `backend/`. Follow the existing 2-space indentation style and keep semicolons consistent with nearby files. Name mini-program pages by route directory, such as `pages/detail/detail.js`. Name Payload collection files with PascalCase, for example `Projects.ts`.

Run `pnpm backend:lint` before backend changes. Keep client API logic centralized in `mp/services/api.js` rather than duplicating request code in pages. Demo mini-program mode defaults to local storage mock data through `useLocalMock`; disable it only when intentionally testing the local request API.

For lead-related backend changes:

- Use `sanitizeLeadCreateInput()` for `POST /api/leads`.
- Use `sanitizeLeadUpdateInput()` for `PUT /api/leads/:id`.
- Validate attachment ownership with `validateAttachmentOwnership()` before persisting attachments.
- Do not expose `submitterOpenId` or CRM-only fields in `mapLead()` responses.

For Payload admin UX changes:

- Register custom admin components in `backend/app/admin/components/` and wire them through `backend/app/admin/[[...segments]]/importMap.js`.
- Custom collection views (e.g. kanban) belong under `admin.components.views`, not top-level `admin.views`.
- Keep dropdown labels/options aligned with the mini-program via `backend/collections/shared/fieldOptions.ts`.
- Follow-up records are added in the lead detail timeline UI; keep the `follow-records` collection hidden from the sidebar.
- Staff roles are `admin`, `advisor`, and `editor`; enforce permissions through `backend/collections/shared/access.ts`.
- Admin-only lead actions use `POST /api/leads/:id/convert` and `POST /api/leads/:id/sync-merchant`; do not expose these through the mini-program client.

Schema changes against Postgres may require `PAYLOAD_DB_PUSH=true` during build or via `backend/scripts/push-schema.ts`.

## Testing Guidelines

No automated test suite is currently configured. For backend changes, run `pnpm backend:lint` and `pnpm backend:build`. For mini-program changes, verify affected pages in WeChat DevTools, including navigation, form submission, local mock behavior, API error states, lead edit/delete, image upload, token refresh on `401`, and the privacy policy page. If tests are added, place them near the code they cover and use clear names such as `leads.test.ts` or `api.spec.js`.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add lead status validation` or `Fix mini-program detail loading`. Keep commits focused by area.

Pull requests should include a brief summary, affected areas (`mp`, `backend`, `admin`, or deployment), validation steps run, linked issues if any, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit real secrets. Copy `.env.example` to `.env` for deployment settings, set a strong `PAYLOAD_SECRET`, and use a real HTTPS `PAYLOAD_PUBLIC_SERVER_URL` in production. Commit env examples, lockfiles, Dockerfiles, and compose files; do not commit `.env`, `.next/`, `node_modules/`, upload folders, or logs.

Additional security expectations:

- `GET /api/leads` must not return all leads without authentication.
- Mini-program lead updates must not accept CRM fields from the client.
- Uploaded media IDs must be ownership-checked before being attached to leads.
- Production must use `WECHAT_AUTH_MODE=wechat`; do not rely on `X-Dev-OpenId` outside local mock mode.
- The mock admin uses `X-Admin-Access` to list all leads from `server.js`; do not treat that as a production pattern.
- Keep advisor phone and form length limits centralized in `mp/config.js`.