# Backend

Payload CMS + Next.js backend for the campus shop opportunity platform.

The backend provides:

- Payload admin UI with editor-friendly Chinese labels, grouped sidebar, operations dashboard, and lead kanban.
- Public website homepage.
- Production data models for opportunities, leads, follow records, media, merchant profiles, and users.
- Mini-program compatible APIs for projects, leads, auth, image upload, equipment listings, and stats.
- Local-dev WeChat auth fallback plus production `jscode2session` support.
- User-scoped lead CRUD with attachment ownership validation.
- Role-based staff access (`admin`, `advisor`, `editor`).
- Docker/VPS deployment target.

The root `server.js` and `admin/` directory remain available for lightweight mock/demo workflows.

## Stack

- Next.js 16
- Payload CMS 3
- Node.js 24+
- PostgreSQL
- pnpm
- sharp for image compression
- Docker standalone output

## Local Setup

From the repository root:

```bash
node -v # must be v24 or newer
pnpm --dir backend install
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PAYLOAD_SECRET=replace-with-a-strong-secret
DATABASE_URI=postgres://payload:payload@localhost:5432/payload
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

WECHAT_AUTH_MODE=dev
WECHAT_AUTH_DEV_OPENID=dev-openid-local
WECHAT_APPID=wx22fb8f72be05d5c3
WECHAT_APP_SECRET=
```

Start PostgreSQL and the backend:

```bash
docker compose up -d db
pnpm backend:dev
```

After schema changes, push the database schema if needed:

```bash
pnpm --dir backend exec tsx scripts/push-schema.ts
```

Or set `PAYLOAD_DB_PUSH=true` for a one-off build/migration. The Docker image build already uses this flag.

Seed demo data into Payload/PostgreSQL:

```bash
pnpm backend:seed
```

The seed is idempotent for records carrying the internal `seedKey` marker. It downloads real demo images, compresses them with `sharp`, stores them in the `media` collection, and links multiple images to each demo project.

URLs:

- Website: `http://localhost:3000`
- Payload admin: `http://localhost:3000/admin`
- Lead kanban: `http://localhost:3000/admin/collections/leads/kanban`
- Payload API: `http://localhost:3000/api/payload/...`
- Mini-program compatible API: `http://localhost:3000/api/projects`, `http://localhost:3000/api/leads`, `http://localhost:3000/api/uploads/lead-image`

## Admin UX

Custom admin components live in `app/admin/components/`:

| Component | Purpose |
|-----------|---------|
| `OperationsDashboard` | Before-dashboard stats: new leads, overdue follow-ups, online projects, quick links |
| `LeadsKanbanView` | Drag-and-drop lead status board at `/admin/collections/leads/kanban` |
| `LeadQuickActions` | Copy phone, open related project, convert to project, sync merchant profile |
| `LeadFollowTimeline` | Inline follow-up history on lead detail; syncs `nextFollowAt` and status |
| `ProjectEditHints` | Shows the mini-program detail path for the current project |
| `MerchantProfileLeadsPanel` | Related leads panel on merchant profile records |

Shared Chinese labels and select options are centralized in `collections/shared/fieldOptions.ts` so CMS dropdowns match the mini-program.

Sidebar groups:

- `业务运营`: projects, leads
- `客户资产`: merchant profiles
- `系统设置`: users, media

The `follow-records` collection is hidden from the sidebar. Advisors add follow-ups from the lead detail timeline instead.

### Staff roles

Configured on `users.role`:

| Role | Access |
|------|--------|
| `admin` | Full CMS access, user management, delete leads |
| `advisor` | Manage leads, merchant profiles, follow-ups |
| `editor` | Manage projects and media |

Helpers in `collections/shared/access.ts` enforce these rules on collection access.

## Mini-program Auth

`POST /api/auth/wechat-login` returns a signed bearer token used by mini-program lead and upload APIs.

Modes:

- `WECHAT_AUTH_MODE=dev`: local debugging. The backend accepts `X-Dev-OpenId`, request body `devOpenId`, `WECHAT_AUTH_DEV_OPENID`, or `dev-openid-local`. The mini-program only sends `X-Dev-OpenId` when `useLocalMock: true`.
- `WECHAT_AUTH_MODE=wechat`: production mode. The backend exchanges the mini-program `code` through WeChat `jscode2session`; configure `WECHAT_APPID` and `WECHAT_APP_SECRET`.

Authenticated mini-program APIs filter user history by `submitterOpenId`, not by phone number.

## Lead APIs and Security

### Read

- `GET /api/leads` requires `Authorization: Bearer <token>`. Unauthenticated requests without a `phone` query param return `401`.
- `GET /api/leads/:id` returns a single lead for the authenticated owner only.

### Create

- `POST /api/leads` requires auth.
- Uses `sanitizeLeadCreateInput()` so new leads always start with `status: 'new'`.
- Validates that every `attachments` media ID belongs to the current `ownerOpenId`.

### Update / Delete

- `PUT /api/leads/:id` and `DELETE /api/leads/:id` require auth and verify `submitterOpenId`.
- Updates use `sanitizeLeadUpdateInput()`, which whitelists only user-editable fields.
- CRM fields such as `status`, `owner`, `closedAmount`, and `lostReason` cannot be changed through the mini-program API.

### Admin actions

- `POST /api/leads/:id/follow` — add a follow-up record from internal workflows.
- `POST /api/leads/:id/convert` — convert a lead into a `projects` record (used by CMS quick actions).
- `POST /api/leads/:id/sync-merchant` — create or update a `merchant-profiles` record from lead contact/demand fields and link it back to the lead.

These admin routes are intended for authenticated CMS sessions, not the mini-program client.

### Response Shape

`mapLead()` omits internal fields from API responses:

- `submitterOpenId`
- `owner`
- `closedAmount`
- `lostReason`
- `nextFollowAt`

Follow records are still included for the user's own leads.

## Image Uploads

`POST /api/uploads/lead-image` accepts multipart image upload with `Authorization: Bearer <token>`.

Behavior:

- Validates image mime type and size (max 10 MB).
- Rotates and resizes images to max 1600 px.
- Converts uploaded images to JPEG quality 82.
- Stores the compressed image in Payload `media`.
- Records `ownerOpenId`, source, original filename, and compressed size.

Mini-program form submissions then pass the returned media IDs in `attachments`. Lead create/update validates attachment ownership before persisting.

## Equipment Public Listing

`GET /api/equipments` returns active equipment-related leads for the public equipment marketplace page.

Behavior:

- Filters `leadType` to `equipment_sell`, `equipment_buy`, `equipment_recycle`.
- Excludes `closed`, `invalid`, and `paused` statuses.
- Does not return submitter name or phone.
- Masks `regionPreference` and truncates `remark` for public display.

## Collections

- `projects`: unified opportunity model for leasing and transfer opportunities. Cover image is pinned to the top of the edit form; rejected audit records cannot go online.
- `leads`: unified lead pool for leasing, transfer, equipment, recycle, and brand cooperation. Includes `merchantProfile` relationship and kanban view.
- `leads.transferDetails`: structured transfer fields from the mini-program transfer form.
- `leads.equipmentDetails`: structured equipment fields from the mini-program equipment form.
- `leads.attachments`: user uploaded images from mini-program forms.
- `leads.submitterOpenId`: owner identity for user-history isolation.
- `follow-records`: follow-up timeline archive (hidden sidebar; maintained from lead detail).
- `merchant-profiles`: long-term merchant demand profile with `relatedLeads`.
- `media`: demo images, lead attachments, and admin uploads.
- `users`: Payload admin users with `role` and `displayName`.

## Production-compatible API

In addition to Payload's native REST API under `/api/payload/...`, the backend exposes compatibility routes used by the mini-program and mock/admin workflow:

- `POST /api/auth/wechat-login`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads`
- `PUT /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/follow`
- `POST /api/leads/:id/convert`
- `POST /api/leads/:id/sync-merchant`
- `GET /api/equipments`
- `POST /api/uploads/lead-image`
- `GET /api/stats`

These routes use Payload's local API internally and return lightweight JSON shapes compatible with the mini-program service layer.

Shared helpers live in `backend/app/api/_shared/`:

- `auth.ts`: HMAC token signing and verification.
- `payloadApi.ts`: mapping, sanitization, attachment ownership checks, and public text masking.

## Production Build

From the repository root:

```bash
pnpm backend:lint
pnpm backend:build
pnpm backend:start
```

The Next config uses `output: 'standalone'`, so the Docker image copies `.next/standalone` and `.next/static` into the runtime image.

## Docker Deployment

From the repository root:

```bash
cp .env.example .env
docker compose up -d --build
```

Required root `.env` values:

```env
PAYLOAD_SECRET=replace-with-a-strong-secret
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.example
POSTGRES_USER=payload
POSTGRES_PASSWORD=replace-with-a-strong-db-password
POSTGRES_DB=payload

WECHAT_AUTH_MODE=wechat
WECHAT_APPID=your-wechat-appid
WECHAT_APP_SECRET=your-wechat-app-secret
```

The compose stack starts:

- `payload`: Next.js + Payload app on port `3000`.
- `db`: PostgreSQL 16 with persistent `payload-data` volume.

Use HTTPS in production through a reverse proxy such as Nginx, Caddy, or a managed load balancer.

## Validation

Run before deployment:

```bash
pnpm backend:lint
pnpm backend:build
```

Optional seed/API check:

```bash
pnpm backend:seed
```

Optional mock validation from the root:

```bash
pnpm dev
```

Then open:

- Mock admin: `http://localhost:5173/admin/index.html`
- Mock stats API: `http://localhost:5173/api/stats`

The mock admin sends `X-Admin-Access: local-admin` when loading leads. Override with `ADMIN_ACCESS_KEY` if needed.