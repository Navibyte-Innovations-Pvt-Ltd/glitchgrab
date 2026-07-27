# @glitchgrab/scripts

One script: `db-sync.ts` — pulls `PROD_DATABASE_URL` (Neon) into whatever
local database `NEXT_DIRECT_URL` points at, for getting a fresh local copy of
real data.

Run from the monorepo root:

```bash
bun run db:sync
```

## Safety guards (read before touching this file)

The script hard-stops if:
- `NEXT_DIRECT_URL` (the destination) points at a remote/cloud host
  (`neon.tech`, `.aws.`, `supabase`, `railway.app`, `planetscale`,
  `render.com`) — it's a one-way pull INTO local, never a push, and the first
  step is `DROP SCHEMA public CASCADE` on the destination.
- `NEXT_DIRECT_URL` and `PROD_DATABASE_URL` resolve to the same host — refuses
  to let you overwrite production with itself.

Do not weaken or remove these checks to work around a one-off error — they
exist because this script's first action is destructive.
