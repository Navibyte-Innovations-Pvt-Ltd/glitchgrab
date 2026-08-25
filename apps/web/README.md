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

## Chrome Web Store release watching — what you actually do

Glitchgrab watches your extensions on the Chrome Web Store and messages you on
WhatsApp when something needs you. The store itself tells nobody anything: a
review verdict lands hours or days after CI has exited, on a console nobody has
open. That is how a version ends up sitting in **Draft** for a week while the
team believes it shipped.

### Setup — connect, then paste a link

1. **Extensions → Connect Google account.** Consent screen, Allow, back to the
   page. Read-only: Glitchgrab can see what the store says about your
   extensions and nothing else — it cannot publish.
2. **Watch an extension → paste the store link.** The id is pulled out of the
   URL and the name is read off the public listing, so there is nothing to
   type. An extension that has never been published has no public page — name
   that one yourself.
3. **Publisher id** — asked once, on your first extension only (developer
   dashboard → Account). Every extension on that account shares it.
4. Make sure your WhatsApp number is on your Glitchgrab profile, or there is
   nowhere to send anything.

No key file, no JSON, no *group* publisher account.

**Why the link is needed at all:** the Chrome Web Store API cannot list a
publisher's items. Its entire surface is five per-item methods
(`fetchStatus`, `publish`, `cancelSubmission`, `setPublishedDeployPercentage`,
`upload`) and the older v1.1 API is retired. Nothing anywhere answers "which
extensions does this account have", so each one is named once.

### After that, you do nothing

Every 30 minutes Glitchgrab asks the store about each extension and updates the
page. You get a WhatsApp only when there is something to do:

| What happened | You hear about it |
|---|---|
| Google rejected or removed it | **Immediately**, with Google's own reason |
| It went live | Once, when it flips |
| A version has been sitting in Draft | After **12 hours** — the silent one |
| Review is taking unusually long | After **3 days** |
| The store answered something unreadable | Never — it shows as "not read yet" on the page |

Each message carries a button straight to that item in the developer console.

### Reading the Extensions page

- **live vX** — what users have right now
- **waiting vY** (amber) — what is submitted and not out yet
- **draft — not submitted** — uploaded, never sent for review. Nobody has it
- **needs attention** — rejected or taken down
- **not read yet** — we could not reach the store; the row shows the error.
  If the connected account itself stopped working (revoked access), the
  Chrome Web Store access card says so and offers Connect again

### Before any of it sends

The WhatsApp template `extension_review_status` has to be approved by Meta.
It is prepared in WhatsApp Manager — **you press Submit for Review**, since a
rejected submission burns a review cycle against the account. Until it is
approved the watcher still runs and the page still updates; only the message
fails, silently.

### Releasing from CI

Push to `main` touching `packages/extension/**` and
`.github/workflows/release-extension.yml` builds, versions, zips and submits it
— or run it by hand from the Actions tab, where you can pick the bump and tick
**dry run** to build without submitting.

The repo needs exactly one secret, `GLITCHGRAB_TOKEN` (Glitchgrab → API Tokens,
for this project). No Chrome Web Store credentials live in any repo: the store
account is the one you connected on the Extensions page, and Glitchgrab does the
upload.

The version comes from the **store**, not from a tag — whatever is live or
already submitted, plus the bump inferred from your conventional commits
(`feat:` → minor, `feat!:` → major, otherwise patch).

A green tick means *submitted*. Google's verdict lands hours or days later and
reaches you on WhatsApp.

Full detail: `agent_docs/chrome-web-store.md`. Template spec:
`WHATSAPP_TEMPLATES.md` §7.
