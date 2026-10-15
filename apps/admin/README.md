# E-commerce Admin Dashboard

A standalone React admin dashboard for managing products, orders and
customers. It never talks to the database directly — everything goes
through a Node.js API server, except Supabase Auth for login/session.

```
Admin Dashboard → Node.js API Server → Supabase
Admin Dashboard → ImageKit.io (image upload) → Node.js API → Supabase
```

## Tech stack

React 19 · TypeScript · Mantine UI · Tailwind (utilities only, no
preflight) · Zustand · TanStack Query · Zod · React Router · Supabase
Auth · ImageKit.io · MSW (mock API for local dev)

## Getting started

```bash
npm install
cp ../../.env.example ../../.env   # monorepo root, shared with apps/api (see below)
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase project used for Auth only. Users are created manually in Supabase — there is no sign-up flow. |
| `VITE_API_BASE_URL` | Base URL of the Node.js API server (source of truth for all data and authorization). |
| `VITE_IMAGEKIT_URL_ENDPOINT` | Your ImageKit URL endpoint, used for building/transforming delivery URLs. |
| `VITE_API_MOCK` | When `true`, `/products`, `/orders`, `/customers`, `/dashboard`, `/imagekit/auth` and the ImageKit upload call are all served by an in-memory mock (`src/mocks`) instead of a real server — useful before the backend exists. Supabase Auth is **never** mocked; you still need a real Supabase project with at least one user to sign in. |

With `VITE_API_MOCK=true` you can explore the whole dashboard (products,
colors/images, orders, customers, dashboard metrics) against realistic
mock data with zero backend setup. Flip it to `false` and point
`VITE_API_BASE_URL` at your real API server when it's ready — no
frontend code changes required, since the mock handlers mirror the
exact same contract as `src/lib/api/*`.

## Architecture

```
src/
  app/            Router, theme, top-level providers
  features/       One folder per domain (auth, dashboard, products, orders, customers, settings)
    <feature>/
      components/ Presentational pieces specific to the feature
      hooks/       TanStack Query hooks + feature logic (never inline in components)
      pages/       Route-level components
  components/      Shared, feature-agnostic UI (page header, status badges, empty/error states...)
  lib/
    api/           Typed API client functions — the ONLY place fetch() is called
    supabase.ts    Supabase client (Auth only)
    query-client.ts TanStack Query client + query key factory
  stores/          Zustand stores — UI/client state only (sidebar, list filters), never server data
  schemas/         Zod schemas for forms and list-filter params
  types/           Shared API contract types
  mocks/           MSW handlers + seed data (only active when VITE_API_MOCK=true)
```

Key decisions:

- **Server state lives in TanStack Query, not Zustand.** Zustand is only
  used for UI preferences (sidebar collapsed) and list filters that
  should survive navigating to a detail page and back.
- **Authorization is server-side.** The frontend treats a valid
  Supabase session as "logged in" but always defers to `GET /auth/me`
  (the API server) for the actual admin profile/role — see
  `src/features/auth/context/auth-provider.tsx`.
- **Colors/images are modeled for instant switching.** Each `ProductColor`
  embeds its own `images[]` in the API response — the storefront can do
  `selectedColor.images` with no extra request. See
  `src/types/api.ts`.
- **Images upload directly to ImageKit from the browser.** The API
  server only ever hands out short-lived signed upload params
  (`GET /imagekit/auth`); the ImageKit private key never reaches the
  frontend. The resulting URLs are included in the product
  create/update payload, so Supabase writes still happen exclusively
  through the API server.

## Scripts

```bash
npm run dev       # start dev server
npm run build     # tsc -b && vite build
npm run lint       # oxlint
npm run preview   # preview a production build
```

## Verified

- TypeScript (`tsc -b`) and lint (`oxlint`) pass clean.
- Production build succeeds with route-level code splitting.
- Manually verified in-browser against the mock API: login form
  validation and error handling, protected-route redirects, dashboard
  metrics, product list/filter/create/edit, color & image management
  (including a real drag-and-drop upload through the mocked ImageKit
  endpoint), order list/detail/status update, customers list, and
  sign-out.
