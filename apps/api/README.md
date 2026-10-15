# Ecommerce API Server

Node.js + TypeScript (Fastify) API that powers the ecommerce **admin dashboard** and **public storefront**. It is the only layer with access to the Supabase Postgres database and the ImageKit private key.

**Documentation: [docs/README.md](./docs/README.md)** (architecture, features and their status, API contracts, database, decisions, setup)

```bash
npm ci
cp ../../.env.example ../../.env          # fill in Supabase, ImageKit, CORS values
npm run db:migrate
npm run admin:create -- --email you@example.com --role owner
npm run dev                   # http://localhost:4000  (Swagger UI at /docs)
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with reload |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled server |
| `npm test` | Unit + HTTP tests |
| `npm run test:integration` | Real-Postgres tests (needs `TEST_DATABASE_URL`, truncates tables) |
| `npm run typecheck` / `npm run lint` | Type checking / oxlint |
| `npm run verify` | typecheck + lint + test + build |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / load dev data |
| `npm run admin:create` | Grant, change, or revoke admin access for a Supabase user |
| `npm run assets:cleanup` | Retry pending ImageKit deletions |
