# Bramble

Household jobs & life-skills app — the house asks, not you. Jobs are **dealt**
at 6am to whoever's home, undone jobs become paid work anyone can grab, and one
dial reshapes the whole system on the days you haven't got it in you.

Built to the spec in `household-app-build-spec.md`. Stack carried across from
Kinnect: Next.js 16 / TypeScript / Tailwind / Supabase / Vercel / PWA.

## Getting started

```bash
npm install
cp .env.example .env.local        # fill in Supabase + secrets
node --test lib/*.test.ts          # rota-engine tests
npm run dev
```

### Supabase

1. Create a project. Run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Fill `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — used by cron + all Kid-Mode writes)
   - `CHILD_SESSION_SECRET` — `openssl rand -hex 32`
   - `CRON_SECRET` — `openssl rand -hex 32`
3. Seed the demo household (two grown-ups + five children):
   ```bash
   node --env-file=.env.local scripts/seed.ts
   ```
4. Sign the two parents up via Supabase Auth, then insert their `parent_account` rows
   (the seed script prints the exact SQL).

## The three device states (spec §3.3)

| State | Route | Entered by |
|---|---|---|
| **Parent Mode** | `/parent` | Supabase Auth sign-in at `/log-in` |
| **Kid Mode** | `/kid` → `/kid/home` | Parent taps "Hand the phone over" → child taps face + PIN |
| **Away Lock** | (in `/kid/home`) | Auto after 60s backgrounded — read-only |

Children are **rows, not users**. Every Kid-Mode read/write goes through a
server route holding a validated child-session token on the service-role client;
the anon client is never exposed to Kid Mode.

## The engine

- `lib/rota.ts` — the pure, deterministic 6am deal (tier logic, seeded shuffle,
  no-repeat, `low_demand_safe`, load-state behaviour). Tested in `lib/rota.test.ts`.
- `lib/presence.ts` — who's home today (full-time / EOW + overrides).
- `lib/money.ts` — balance = SUM(ledger), caps, part-done awards.

## Cron (Vercel, see `vercel.json`)

| Route | Schedule | Job |
|---|---|---|
| `/api/cron/rota` | `0 6 * * *` | Deal the day |
| `/api/cron/fallback` | `5 18 * * *` | Undone jobs → paid bonus board |
| `/api/cron/pocket-money` | `0 0 * * 1` | Weekly base pocket money |

All three require `Authorization: Bearer $CRON_SECRET` (Vercel sends it).

## Status

Phase-1 foundation + core vertical slice is in place: schema + RLS, ported auth
(parent + numeric/picture PIN + child sessions + handover), the rota engine
(tested) and all three crons, the Kid/Parent/Away-Lock UI, and the ported
landing page. Still to do from spec §10 Phase 1: caps enforced at claim-time,
per-child weekend-pool visuals polish, and the parent Jobs/Money/Household CRUD
screens. Phase 2/3 (collective goal, life-skills, photo evidence) not started.
