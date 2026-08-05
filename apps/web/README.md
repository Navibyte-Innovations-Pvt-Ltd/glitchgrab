# @glitchgrab/web

The Glitchgrab dashboard + API — Next.js 15 (App Router), deployed to
[glitchgrab.dev](https://glitchgrab.dev) on Vercel. This is where every input
flow (SDK auto-capture, SDK report button, dashboard chat, QA magic-link,
Chrome extension) lands, and where GitHub issues actually get created.

See the repo-root `CLAUDE.md` for the full architecture, token model, and
mutation → invalidation checklist. This file covers just this app's local
setup.

## Stack

- **Next.js 15** App Router, server components by default
- **Neon** (serverless Postgres) via **Prisma**
- **NextAuth.js** with GitHub OAuth
- **AWS S3** for screenshot storage
- **Tailwind CSS v4**
- **TanStack Query + Axios** client-side (never raw `fetch` on the client —
  `useQuery` for GET, `useMutation` for POST/PATCH/DELETE)
- **Razorpay** billing

## Commands

```bash
bun run dev              # next dev
bun run build            # prisma generate + next build
bun run start            # next start
bun run lint             # eslint .
bun run validate         # eslint . && tsc --noEmit
bun run test             # bun test lib/ app/api/v1/
```

From the monorepo root:

```bash
bun run db:generate      # prisma generate
bun run db:push          # prisma db push
bun run db:migrate       # prisma migrate dev
bun run db:deploy        # prisma migrate deploy (production)
bun run db:studio        # prisma studio
bun run db:sync          # pull PROD_DATABASE_URL → local (has hard guards
                          # against ever writing TO a remote DB — see the script)
```

## Database safety

`.env` at the monorepo root holds both `NEXT_POSTGRES_URL`/`NEXT_DIRECT_URL`
(the DB Prisma actually uses) and `PROD_DATABASE_URL` (Neon, only used by
`db:sync` as a read source). **All day-to-day work happens against
`localhost` Postgres** — check `NEXT_POSTGRES_URL` before running any
migration command; if it doesn't say `localhost`, stop.

## Key directories

```
app/api/v1/          versioned API routes (SDK, dashboard, QA, extension, GitHub, billing, cron)
app/dashboard/        personal (non-org-scoped) dashboard pages
app/org/[slug]/       org-scoped dashboard (overview, repos, reports, tester activity, members, billing)
app/qa/               QA-tester magic-link + OTP-session pages
lib/                  db client, GitHub App auth, S3, webhooks, signature/dedup, extension-session helpers
prisma/               schema + migrations
```

## Prisma migrations — naming matters

Name migrations with a **full timestamp** (`YYYYMMDDHHMMSS_description`), not
just a date. Prisma applies migrations in **alphabetical folder order** — two
same-day migrations named only by date can apply in the wrong order if their
descriptions happen to sort differently than they were written (e.g.
`..._extension_session_tester_link` sorting before
`..._extension_tester_sessions` purely because `s` < `t`), silently running an
`ALTER TABLE` before the `CREATE TABLE` it depends on.
