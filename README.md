# Ecommerce Monorepo

A pnpm + Turborepo monorepo for an ecommerce backend and its admin dashboard.

| App | Path | Stack | Purpose |
| --- | --- | --- | --- |
| `@ecommerce/api` | [`apps/api`](apps/api) | Node 24, Fastify, Postgres (Supabase), ImageKit | REST API for the admin dashboard and the public storefront |
| `@ecommerce/admin` | [`apps/admin`](apps/admin) | React 19, Vite, Mantine, TanStack Query | Admin dashboard (products, orders, customers) |

```
Admin dashboard ──► API (Fastify) ──► Supabase Postgres
      │                  ▲
      ├─ Supabase Auth (login only)
      └─ ImageKit (direct image upload, signed by the API)

Storefront ──► API (/api/store/*)         API ──► storefront revalidation webhook
```

The admin never reads or writes the database directly. All data goes through the API. Supabase is used by the admin for login only.

The storefront is not in this repo. It only appears here as the CORS origin and the revalidation webhook target.

## Prerequisites

- **Node.js 24+**. The `.nvmrc` pins 24. Run `nvm use` if you use nvm.
- **pnpm 10.24** (the `packageManager` field). Run `corepack enable`, then pnpm picks the right version automatically.
- A **Supabase** project, for Postgres and Auth.
- An **ImageKit** account, for product images.
- Optional: a local PostgreSQL 15+ for the API integration tests.

## Run locally

### 1. Install

```bash
pnpm install
```

### 2. Configure the environment

There is **one `.env` file at the monorepo root**. Both apps read it. The API reads it at runtime, and Vite reads it through `envDir`.

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Fill in at least these values:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (port 6543) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | Only if your project still uses the legacy HS256 secret. Leave it empty for projects on JWT signing keys. |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | ImageKit → Developer options |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` |
| `CORS_ORIGIN` | Must include the admin origin. Vite serves it at `http://localhost:5173`. |

The `VITE_*` values for Supabase and ImageKit already point at the shared ones in `.env.example`. `FRONTEND_REVALIDATE_URL` and `REVALIDATE_SECRET` can stay empty locally. The API then skips the storefront cache purge.

Full variable reference: [`apps/api/docs/development/environment.md`](apps/api/docs/development/environment.md).

> Only `VITE_*` variables reach the browser. Never create a `VITE_` copy of `IMAGEKIT_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or `REVALIDATE_SECRET`.

### 3. Set up Supabase

1. Authentication → Providers → Email: **disable "Allow new users to sign up"**. Disable anonymous sign-ins too. Users are created manually.
2. Authentication → Users → **Add user** (email + password, tick **Auto Confirm User**).

### 4. Create the database schema and the first admin

Migrations need a **session pooler or direct connection** (port 5432), not the transaction pooler. Pass it for that command only:

```bash
cd apps/api
DATABASE_URL="<session-or-direct-url>" pnpm db:migrate     # PowerShell: $env:DATABASE_URL="..."; pnpm db:migrate
pnpm db:seed                                                 # optional: sample categories and draft products
pnpm admin:create --email you@example.com --role owner --name "Your Name"
```

`admin:create` links the Supabase user you made in step 3 to an admin profile.

### 5. Start everything

From the repo root:

```bash
pnpm dev
```

| Service | URL |
| --- | --- |
| API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/docs |
| Health / readiness | `/health`, `/health/ready` |
| Admin dashboard | http://localhost:5173 |

Sign in to the admin with the user from step 3.

To run one app, use `pnpm --filter @ecommerce/api dev` or `pnpm --filter @ecommerce/admin dev`.

**No backend yet?** Set `VITE_API_MOCK=true` and the admin runs against an in-memory mock API (MSW). Supabase login is never mocked.

### Useful commands

Run these from the root. Turborepo runs them in every app.

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test          # API unit and HTTP tests; no database needed
```

API-only scripts (run in `apps/api`):

| Command | What it does |
| --- | --- |
| `pnpm db:migrate [--status]` | Apply SQL migrations from `db/migrations` |
| `pnpm db:seed` | Insert dev data |
| `pnpm admin:create` | Create an admin profile for an existing Supabase user |
| `pnpm assets:cleanup` | Retry failed ImageKit deletions |
| `pnpm verify` | Typecheck, lint, test and build |
| `pnpm test:integration` | Runs real SQL. Needs `TEST_DATABASE_URL` pointing at a **disposable** database, because it truncates every table. See [setup.md](apps/api/docs/development/setup.md#integration-tests). |

## Production

### API

The API deploys to **Vercel** (`apps/api/vercel.json`). `api/index.js` forwards every request to the Fastify app, and a daily cron calls `/api/cron/cleanup` at 03:00 UTC to retry failed ImageKit deletions. The API can also run as a plain Node process (see below).

**Vercel project settings**

- Root Directory: `apps/api`.
- Install, build and output settings come from `vercel.json`. Don't override them.
- Environment variables: add everything from `.env.example` in the Vercel dashboard. Skip the `VITE_*` values, which are for the admin.

**Production values to set**

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (JSON logs, API docs off, generic 500 messages) |
| `DATABASE_URL` | Supabase **transaction pooler** (port 6543). Keep `DATABASE_POOL_MAX` small, because every serverless instance opens its own pool. |
| `CORS_ORIGIN` | Required in production. Comma-separated admin and storefront origins. |
| `TRUST_PROXY` | `true`, so rate limiting sees real client IPs |
| `FRONTEND_REVALIDATE_URL` | Storefront webhook, for example `https://shop.example.com/api/revalidate` |
| `REVALIDATE_SECRET` | Must equal `REVALIDATE_SECRET` in the storefront's env |
| `ASSET_CLEANUP_INTERVAL_MS` | `0` on Vercel. The cron route does the cleanup instead of an in-process timer. |

**Release steps**

1. If the release adds migrations, run `pnpm db:migrate` against the production database **before** deploying. Use the session or direct connection.
2. Deploy: push to the branch connected to Vercel, or run `vercel --prod` from `apps/api`.
3. Check `GET /health` and `GET /health/ready`.

**Running it as a plain Node server instead** (container, VM, PaaS):

```bash
pnpm install --frozen-lockfile
pnpm --filter @ecommerce/api build
NODE_ENV=production node apps/api/dist/index.js
```

It handles `SIGTERM` gracefully. Use `/health` for liveness and `/health/ready` for readiness. Leave `ASSET_CLEANUP_INTERVAL_MS` at its default, or set it to `0` and run `pnpm assets:cleanup` from cron.

### Admin dashboard

The admin is a static Vite build (`pnpm --filter @ecommerce/admin build` writes `apps/admin/dist`). Host it on any static host, for example a second Vercel project.

- Root Directory: `apps/admin`. Framework preset: Vite. Build command: `pnpm build`. Output directory: `dist`.
- Add a rewrite of all paths to `/index.html`, because the app uses client-side routing.
- Set these at **build time**, because Vite inlines them into the bundle:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_IMAGEKIT_URL_ENDPOINT`
  - `VITE_API_BASE_URL` — the production API URL including `/api`, for example `https://api.example.com/api`
- Leave `VITE_API_MOCK` unset.
- Add the admin's production origin to the API's `CORS_ORIGIN`, then redeploy the API.

### Production checklist

- [ ] No secrets committed. `.env` and `.env.*` are gitignored. Use the platform's secret store.
- [ ] Migrations applied before the release.
- [ ] `CORS_ORIGIN` lists the real admin and storefront origins.
- [ ] `REVALIDATE_SECRET` matches on the API and the storefront.
- [ ] Supabase email sign-ups and anonymous sign-ins are disabled.
- [ ] At least one admin created with `pnpm admin:create`.
- [ ] A CDN or edge cache sits in front of `/api/store/*`, so the `Cache-Control` headers (`STORE_CACHE_MAX_AGE`) take effect.

## More documentation

- API docs index: [`apps/api/docs/README.md`](apps/api/docs/README.md). It covers architecture, ADRs and per-feature docs.
- Environment variables: [`apps/api/docs/development/environment.md`](apps/api/docs/development/environment.md)
- Contributing: [`apps/api/docs/development/contributing.md`](apps/api/docs/development/contributing.md)
- Admin dashboard: [`apps/admin/README.md`](apps/admin/README.md)

> The older docs under `apps/` still show `npm` commands. This monorepo uses **pnpm**, so substitute `pnpm` for `npm` when following them.
