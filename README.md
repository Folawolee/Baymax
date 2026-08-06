# Pinta Ops — Frontend

Next.js (App Router) client for the Pinta Operations Platform. Implements
`bimpe-platform-ui-prompt.md`'s design spec against the backend one level up
(`../` — see its README to get that running first).

## Setup

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:4000
npm run dev                        # :3000
```

Requires the backend running (`npm run dev` in the repo root) and seeded
(`npm run seed` there) — log in with any seeded user, e.g.
`owner@lagosconstruct.example` / `password123`.

## Architecture

- **Independently run, type-shared via a relative import.** `src/lib/trpc.ts`
  imports the backend's `AppRouter` type directly
  (`../../../src/server/trpc/routers/_app`) — a type-only import, erased at
  compile time, so there's no runtime coupling between the two apps and no
  monorepo/workspace tooling needed. This gives full end-to-end type safety
  on every tRPC call.
- **Client-rendered, not SSR-protected.** Auth token lives in `localStorage`
  (`src/lib/auth.tsx`); the `(app)/layout.tsx` route group guards everything
  under it and redirects to `/login` when the token is missing/invalid.
- **One shared table/record pattern** (`src/components/data/DataTable.tsx`,
  `RecordDetailLayout.tsx`) reused across Materials, Production, Inventory
  and Procurement — the Odoo lesson from the UI spec's reference audit.
- **Exactly three status colors** (`--status-good/warn/bad` in
  `src/app/globals.css`), always paired with a text label
  (`StatusBadge`/`statusCellClass` in `src/components/data/StatusBadge.tsx`) —
  never color alone.
- **Bimpe is a persistent panel, not a page** (`src/components/bimpe/`),
  triggered from the desktop nav and the mobile tab bar, sharing one
  open/close state (`src/lib/bimpePanelState.tsx`). Deep-links are built from
  the ids already present in `bimpe.chat`'s tool-call results
  (`src/components/bimpe/deepLinks.ts`).
- **Tenant terminology is live**, not hardcoded — `useCompanyConfig()`
  (`src/lib/companyConfig.ts`) reads `company.getMine` so "Site" vs "Line"
  and the production unit label render per-tenant everywhere in copy.

## Known stubs (see repo root README's non-goals)

- **Offline queue** (`src/lib/offlineQueue.tsx`) is in-memory only — it
  queues mutations made while offline and replays them on reconnect within
  the same tab session, but doesn't survive a reload. A real
  service-worker/IndexedDB-backed queue is future work.
- **Photo capture** (`src/components/data/PhotoCaptureField.tsx`) previews
  locally but doesn't upload — the backend has no file storage yet.

## Commands

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
```
# pinta-software
