# Deploying Bramble

A step-by-step checklist to take Bramble from this repo to a live, installable
app. Work top to bottom — each step assumes the previous one is done.

Everything Claude can't do for you (creating accounts, holding secrets, clicking
deploy) lives here. Estimated time: ~30–40 minutes.

---

## 0. Before you start

**Accounts needed: just GitHub, Vercel, and Supabase — no new sign-ups.** Bramble
v1 uses no other third-party services (no Stripe, Resend, AI key, email provider,
or domain registrar). If you already have those three, you're set.

- A **GitHub** account — hosts the repo Vercel deploys from.
- A **Vercel** account — hosting + cron. **Vercel Pro** is recommended for
  reliable cron timing (see §5), but it's an *upgrade on your existing account*,
  not a separate one, and you can start on the free Hobby plan.
- A **Supabase** account — database + auth. The free tier is fine to start.
- Node 18+ locally (already on your machine — the app was built with it). Not an
  account, just used to run the seed script in §4.

The only "accounts" you create during deploy are the two parent **users** inside
Supabase Auth in §6 — those are app logins, not external services.

---

## 1. Create the Supabase project

1. supabase.com → **New project**. Pick a name (e.g. `bramble`), a strong
   database password, and a region close to you (London/`eu-west-2` for the UK).
2. Wait for it to finish provisioning (~2 minutes).
3. Open the **SQL Editor** → **New query**. Run **each file in
   [`supabase/migrations/`](supabase/migrations/) in filename order** — paste the
   contents, Run, then repeat for the next:
   - `0001_init.sql` — all tables, indexes, and the parents-only RLS policies
   - `0002_job_fallback.sql` — the per-job 6pm fallback price column
   - `0003_dealt_to.sql` — records the original assignee for the insights panel
   - `0004_frequency_room_people.sql` — monthly frequency, room, multi-person jobs

   Each should report "Success. No rows returned."
4. Go to **Project Settings → API** and copy three values — you'll paste them in
   §3 and §5:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` `public` key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` key** (under "Project API keys", click reveal) →
     `SUPABASE_SERVICE_ROLE_KEY`

   > ⚠️ The `service_role` key bypasses all security. Never put it in client code
   > or commit it. It only ever goes in server-side env vars.

---

## 2. Generate the two app secrets

Run this locally, twice, and keep the output somewhere safe (a password manager):

```bash
openssl rand -hex 32   # → CHILD_SESSION_SECRET  (signs Kid-Mode sessions)
openssl rand -hex 32   # → CRON_SECRET           (protects the cron routes)
```

---

## 3. Fill in `.env.local` (for local seeding)

Copy the template and paste in the values from §1 and §2:

```bash
cp .env.example .env.local
```

`.env.local` should end up looking like this (real values, not placeholders):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...       # or an eyJ… JWT
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...                # or an eyJ… JWT
CHILD_SESSION_SECRET=<first openssl value>
CRON_SECRET=<second openssl value>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.local` is git-ignored — it stays on your machine.

---

## 4. Seed the household

This creates the real household, the five children (with their PINs), the job
library, and a goal each:

```bash
node --env-file=.env.local scripts/seed.ts
```

It prints something like:

```
Seeded household: 3f2a…-uuid
PINs — Mabel 1379, Nell 2468, Posy 1357
Picture PINs — Rowan fox/octopus/bee, Bo owl/whale/frog
After you sign the two parents up in Supabase Auth, run:
  insert into parent_account (user_id, household_id, display_name)
  values ('<auth-user-id>', '3f2a…-uuid', 'Parent one');
```

**Copy the household UUID** — you need it in §6. (Edit the names/PINs/jobs in
[`scripts/seed.ts`](scripts/seed.ts) first if you want to change anything; re-run
to reseed — it wipes and recreates the demo household each time.)

---

## 5. Push to GitHub and deploy on Vercel

1. Create a **new GitHub repo** (private is fine and recommended) and push:
   ```bash
   git remote add origin git@github.com:<you>/bramble.git
   git push -u origin main
   ```
2. Vercel → **Add New → Project** → import that repo. Framework auto-detects as
   Next.js. Don't deploy yet — first add the env vars.
3. In the import screen (or **Project → Settings → Environment Variables**) add
   all six, for the **Production** environment:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from §1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from §1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from §1 |
   | `CHILD_SESSION_SECRET` | from §2 |
   | `CRON_SECRET` | from §2 |
   | `NEXT_PUBLIC_APP_URL` | your Vercel URL, e.g. `https://bramble.vercel.app` |

4. Click **Deploy**. When it's live, update `NEXT_PUBLIC_APP_URL` to the real
   production URL if it changed, and redeploy.

### About the crons

[`vercel.json`](vercel.json) already declares three jobs:

| Route | Schedule (UTC) | What it does |
|---|---|---|
| `/api/cron/rota` | `0 6 * * *` | Deals the day's jobs |
| `/api/cron/fallback` | `5 18 * * *` | Sweeps undone jobs onto the paid board |
| `/api/cron/pocket-money` | `0 0 * * 1` | Weekly base pocket money (Mondays) |

Two things to know:

- **Vercel sends the secret for you.** When `CRON_SECRET` is set, Vercel adds
  `Authorization: Bearer <CRON_SECRET>` to every cron call automatically, which is
  exactly what the routes check. No extra wiring needed.
- **Pro plan for reliable timing.** On the free Hobby plan Vercel runs crons only
  ~once a day at an *imprecise* time — so the 6am deal might land whenever. On
  **Pro**, the schedules above fire on time. Also note times are **UTC**: `0 6`
  is 06:00 GMT (winter) / 07:00 BST (summer). Shift the hour if you want a true
  local 6am year-round.

---

## 6. Create the two parent accounts

1. Supabase → **Authentication → Users → Add user**. Add your two parents with email
   + password. Tick **Auto Confirm User** (so they can sign in immediately).
2. For each, copy their **User UID** (the UUID in the users list).
3. Supabase → **SQL Editor**, and run this once per parent, using the household
   UUID from §4:

   ```sql
   insert into parent_account (user_id, household_id, display_name) values
     ('<parent-1-uid>', '<household-uuid>', 'Parent one'),
     ('<parent-2-uid>',    '<household-uuid>', 'Parent two');
   ```

   > This must run in the SQL Editor (service role) — there's deliberately no
   > policy that lets a parent insert their own `parent_account` row.

---

## 7. First run + smoke test

The 6am cron hasn't fired yet, so kick off the first day's deal by hand (replace
the URL and secret):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>/api/cron/rota
# → {"ok":true,"date":"…","results":{ … dealt / board counts … }}
```

Then walk the flow on your phone (or any browser):

1. Open the app → **Sign in** as a parent → you land in **Parent Mode / Today**.
2. Tap **Hand the phone over** → the profile picker shows the five faces.
3. Tap a child → enter their PIN (numeric) or picture PIN (the fives) → their
   **Kid Mode** home appears with today's dealt jobs and the board.
4. Tap **Done** / **I'll do it** on a job → back in Parent Mode, it shows in
   **To review** → approve it → the child's balance/goal bar moves.
5. **Install it:** in mobile Chrome/Safari use "Add to Home Screen" — Bramble
   installs as a standalone app (that's the PWA manifest + icons doing their job).

If the cron returns `401 Unauthorized`, the `CRON_SECRET` in your `curl` doesn't
match the one in Vercel's env vars.

---

## Handy references

- Change jobs, PINs, caps, or the household: edit [`scripts/seed.ts`](scripts/seed.ts) and re-run §4, or manage rows directly in Supabase.
- Rota logic and its tests: [`lib/rota.ts`](lib/rota.ts), [`lib/rota.test.ts`](lib/rota.test.ts) (`node --test lib/*.test.ts`).
- Signed-out product tour (no data needed): visit `/demo`.
- Feature status and architecture: [`README.md`](README.md).
