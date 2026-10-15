# Development Setup

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 24 LTS (`.nvmrc`) |
| npm | 10+ (lockfile: `package-lock.json`) |
| A Supabase project | for Postgres + Auth |
| An ImageKit account | for images |
| Optional: local PostgreSQL 15+ | for the integration test suite |

## 1. Install

```bash
npm ci
cp ../../.env.example ../../.env
```

Fill in `.env`. Every variable is described in [environment.md](./environment.md).

## 2. Supabase

1. Create a project (or use the existing one).
2. **Database URL**: Dashboard → **Connect**.
   - For the running server, use the **Transaction pooler** string (port `6543`) as `DATABASE_URL`.
   - For migrations, use the **Session pooler** or direct connection (port `5432`). You can pass it just for the command: `DATABASE_URL=… npm run db:migrate`.
3. **Auth settings**:
   - Authentication → Providers → Email: **disable "Allow new users to sign up"** (users are created manually).
   - Disable anonymous sign-ins.
   - Email confirmation is not required: create users with **Auto Confirm User**.
4. `SUPABASE_URL` = `https://<project-ref>.supabase.co`. If your project still uses the legacy JWT secret (Settings → API → JWT Settings), set `SUPABASE_JWT_SECRET`. Projects on JWT signing keys don't need it.

## 3. Database schema

```bash
npm run db:migrate            # applies db/migrations/*.sql in order
npm run db:migrate -- --status
npm run db:seed               # optional dev data: categories + draft products (no images)
```

## 4. First admin user

1. Supabase → Authentication → Users → **Add user** (email + password, **Auto Confirm User**).
2. `npm run admin:create -- --email you@example.com --role owner --name "Your Name"`

Sign in to the admin dashboard with that email/password.

## 5. ImageKit

1. ImageKit dashboard → **Developer options**: copy the public key, private key, and URL endpoint into `.env`.
2. Optional: set `IMAGEKIT_UPLOAD_FOLDER` (default `/products`).
3. Without ImageKit access locally, you can set `IMAGEKIT_VERIFY_UPLOADS=false`, but image URLs must still start with `IMAGEKIT_URL_ENDPOINT`.

## 6. Run

```bash
npm run dev          # tsx watch, pretty logs, http://localhost:4000
```

- Swagger UI: http://localhost:4000/docs (OpenAPI JSON at `/docs/json`)
- Health: `GET /health`, readiness (checks DB): `GET /health/ready`

Point the admin dashboard's `VITE_API_BASE_URL` at `http://localhost:4000/api` and include its origin in `CORS_ORIGIN`.

## 7. Tests, lint, types, build

```bash
npm test                 # unit + HTTP tests (no database needed)
npm run typecheck
npm run lint
npm run build            # → dist/
npm run verify           # all of the above
```

### Integration tests

`tests/integration` runs the real SQL against Postgres (real repositories, transactions, constraints). It is skipped unless `TEST_DATABASE_URL` is set. **It truncates every table**, so use a disposable database, never Supabase production.

```bash
createdb ecommerce_test
psql -d ecommerce_test -f tests/integration/supabase-stub.sql    # auth.users + anon/authenticated roles
DATABASE_URL=postgres://postgres@localhost:5432/ecommerce_test DATABASE_SSL=false npm run db:migrate
TEST_DATABASE_URL=postgres://postgres@localhost:5432/ecommerce_test npm run test:integration
```

## 8. Production deployment

The server is a standard long-running Node process (any container host, VM, or PaaS).

```bash
npm ci
npm run build
npm prune --omit=dev
NODE_ENV=production node dist/index.js
```

Checklist:

- `NODE_ENV=production`: JSON logs, API docs off, no internal error messages in responses, `CORS_ORIGIN` required.
- `CORS_ORIGIN` = the admin dashboard and storefront origins.
- `TRUST_PROXY=true` behind a load balancer (correct client IPs for rate limiting).
- `DATABASE_URL` = Supabase transaction pooler; size `DATABASE_POOL_MAX × instances` within the pooler's limits.
- Run `npm run db:migrate` (with a session/direct connection) **before** starting a release that needs new migrations.
- Health checks: liveness `GET /health`, readiness `GET /health/ready`.
- Graceful shutdown on `SIGTERM`: stops accepting requests, finishes in-flight ones, closes the pool.
- Put a CDN in front of `/api/store/*` to benefit from its `Cache-Control` headers.
- ImageKit cleanup runs in every instance (`ASSET_CLEANUP_INTERVAL_MS`). Setting it to `0` and running `npm run assets:cleanup` from cron works too.
- Secrets come from the platform's secret store. Never commit `.env`.
