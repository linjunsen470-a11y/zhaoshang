# Backend

Payload CMS + Next.js backend for the campus shop opportunity platform.

The backend provides:

- Payload admin UI.
- Public website homepage.
- Production data models for opportunities, leads, follow records, media, merchant profiles, and users.
- Mini-program compatible APIs for projects, leads, auth, image upload, and stats.
- Local-dev WeChat auth fallback plus production `jscode2session` support.
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

Seed demo data into Payload/PostgreSQL:

```bash
pnpm backend:seed
```

The seed is idempotent for records carrying the internal `seedKey` marker. It downloads real demo images, compresses them with `sharp`, stores them in the `media` collection, and links multiple images to each demo project.

URLs:

- Website: `http://localhost:3000`
- Payload admin: `http://localhost:3000/admin`
- Payload API: `http://localhost:3000/api/payload/...`
- Mini-program compatible API: `http://localhost:3000/api/projects`, `http://localhost:3000/api/leads`, `http://localhost:3000/api/uploads/lead-image`

## Mini-program Auth

`POST /api/auth/wechat-login` returns a signed bearer token used by mini-program lead and upload APIs.

Modes:

- `WECHAT_AUTH_MODE=dev`: local debugging. The backend uses `X-Dev-OpenId`, request body `devOpenId`, `WECHAT_AUTH_DEV_OPENID`, or `dev-openid-local`.
- `WECHAT_AUTH_MODE=wechat`: production mode. The backend exchanges the mini-program `code` through WeChat `jscode2session`; configure `WECHAT_APPID` and `WECHAT_APP_SECRET`.

Authenticated mini-program APIs filter user history by `submitterOpenId`, not by phone number.

## Image Uploads

`POST /api/uploads/lead-image` accepts multipart image upload with `Authorization: Bearer <token>`.

Behavior:

- Validates image mime type and size.
- Rotates and resizes images to max 1600 px.
- Converts uploaded images to JPEG quality 82.
- Stores the compressed image in Payload `media`.
- Records owner openid, source, original filename, and compressed size.

Mini-program form submissions then pass the returned media IDs in `attachments`.

## Collections

- `projects`: unified opportunity model for leasing and transfer opportunities.
- `leads`: unified lead pool for leasing, transfer, equipment, recycle, and brand cooperation.
- `leads.transferDetails`: structured transfer fields from the mini-program transfer form.
- `leads.equipmentDetails`: structured equipment fields from the mini-program equipment form.
- `leads.attachments`: user uploaded images from mini-program forms.
- `leads.submitterOpenId`: owner identity for user-history isolation.
- `follow-records`: follow-up timeline records.
- `merchant-profiles`: long-term merchant demand profile.
- `media`: demo images, lead attachments, and admin uploads.
- `users`: Payload admin users.

## Production-compatible API

In addition to Payload's native REST API under `/api/payload/...`, the backend exposes compatibility routes used by the mini-program and mock/admin workflow:

- `POST /api/auth/wechat-login`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/leads`
- `POST /api/leads`
- `PUT /api/leads/:id`
- `POST /api/leads/:id/follow`
- `POST /api/uploads/lead-image`
- `GET /api/stats`

These routes use Payload's local API internally and return lightweight JSON shapes compatible with the mini-program service layer.

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
