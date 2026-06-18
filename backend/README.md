# Backend

Payload CMS + Next.js backend for the campus shop opportunity platform.

The backend provides:

- Payload admin UI.
- Public website homepage.
- Production data models for opportunities, leads, follow records, merchant profiles, media, and users.
- Docker/VPS deployment target.

The root `server.js` and `admin/` directory remain available for lightweight mock/demo workflows.

## Stack

- Next.js 16
- Payload CMS 3
- PostgreSQL
- pnpm
- Docker standalone output

## Local Setup

From the repository root:

```bash
pnpm --dir backend install
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PAYLOAD_SECRET=replace-with-a-strong-secret
DATABASE_URI=postgres://payload:payload@localhost:5432/payload
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

Start the backend:

```bash
pnpm backend:dev
```

URLs:

- Website: `http://localhost:3000`
- Payload admin: `http://localhost:3000/admin`
- Payload API: `http://localhost:3000/api/payload/...`

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
```

The compose stack starts:

- `payload`: Next.js + Payload app on port `3000`.
- `db`: PostgreSQL 16 with persistent `payload-data` volume.

Use HTTPS in production through a reverse proxy such as Nginx, Caddy, or a managed load balancer.

## Collections

- `projects`: unified opportunity model for leasing and transfer opportunities.
- `leads`: unified lead pool for leasing, transfer, equipment, recycle, and brand cooperation.
- `follow-records`: follow-up timeline records.
- `merchant-profiles`: long-term merchant demand profile.
- `media`: uploaded images/files.
- `users`: Payload admin users.

## Website Behavior

The website homepage reads root `data.json` for demo content and writes website form submissions into the same mock lead pool with `sourceChannel=website`.

For production, replace this demo file write path with Payload collection writes or an API route backed by PostgreSQL.

## Validation

Run before deployment:

```bash
pnpm backend:lint
pnpm backend:build
```

Optional mock validation from the root:

```bash
pnpm dev
```

Then open:

- Mock admin: `http://localhost:5173/admin/index.html`
- Mock stats API: `http://localhost:5173/api/stats`
