# Chrome Web Store releases (#332)

Publishing an extension is two jobs that fail in different ways, and the second
one has never had an owner:

1. **Ship it** — bump the version, zip the build, upload, submit. A CI job does
   this fine.
2. **Find out what happened** — review lands hours or days later, on a console
   nobody has open. The workflow that submitted it exited long ago.

Every extension we ship has at some point sat in **Draft** for a week while the
team believed it was live. A draft and a published version look identical from
outside the console. That is what this feature exists to stop.

## What is built

**The watcher.** A `StoreConnection` holds one connected Google account;
`StoreExtension` rows point at it and carry the ids. `cron/extension-watch`
(every 30 min) polls each one and sends WhatsApp when — and only when — a human
has something to do.

| File | Job |
|---|---|
| `lib/chrome-store.ts` | OAuth connect/refresh, `:fetchStatus`, folding Google's vocabulary into our five states |
| `lib/extension-watch.ts` | When a state change is worth a message. `decideNotification` is unit-tested — it is the whole feature |
| `app/api/v1/cron/extension-watch/route.ts` | The sweep |
| `app/api/v1/extensions/` | Connect, list connections, register, list, delete |

## Why v2 of the API

v1 could only show you the current draft revision. **v2 returns
`publishedItemRevisionStatus` and `submittedItemRevisionStatus` separately** —
which is the entire question. What users have, versus what is waiting.

v2 also brings the thing that removes a whole workflow: **service accounts.**
Google issues refresh tokens on a testing-mode OAuth client that expire after
**7 days**, which is why practice-stack carries `refresh-cws-token.yml`, a cron
whose only job is to rotate a secret every 5 days. A service account added as a
user on the publisher account does not expire. Do not port that cron here.

Also available, unused so far: `:cancelSubmission` (pull back a bad submission)
and `publishType: STAGED_PUBLISH` (pass review, go live on your word).

## How a developer connects

**Click Connect, approve on Google's screen, done.** No file, no paste.

The service-account path this replaced needed a downloaded private key *and* a
**group** publisher account to add that key as a user — which a personal
publisher account cannot do at all. That made it a dead end for some accounts,
not merely a chore.

Already configured on the `GlitchGrab` Cloud project (24 Aug 2026):

- **Chrome Web Store API** — enabled.
- **OAuth client** `Web client 1` — redirect URIs added for both
  `https://glitchgrab.dev/api/v1/extensions/callback` and the localhost
  equivalent. Same client as Calendar and Search Console; no new one.
- **Consent screen** — already **In production**, so refresh tokens do not
  expire. (In *Testing* they die after 7 days — that is the whole reason
  practice-stack carries a token-rotation cron.)
- **Scopes** — `chromewebstore.readonly` + `userinfo.email`.

The read-only scope is deliberate. The full `chromewebstore` scope can publish
to every existing user of every extension on the account; a connection made for
status reporting must not double as a way to ship.

### The flow

1. `POST /api/v1/extensions/connect` mints a signed state + nonce cookie and
   returns Google's consent URL. The nonce is what proves the browser finishing
   consent is the one that started it — a signed state alone only proves *we*
   minted it, and without the binding an attacker can have someone else
   complete a flow that stores their store access under the attacker's user.
2. `GET /api/v1/extensions/callback` exchanges the code, reads the account
   email, and stores the refresh token encrypted (`ENCRYPTION_KEY`, AES-256-GCM).
3. Adding an extension is then a name, an item id and a publisher id. One
   connection covers every extension on that publisher.

### Why the ids are typed

**The v2 API has no list endpoint.** Its discovery document
(`https://chromewebstore.googleapis.com/$discovery/rest?version=v2`) offers
exactly five methods:

```
publishers.items.fetchStatus                    GET
publishers.items.publish                        POST
publishers.items.cancelSubmission               POST
publishers.items.setPublishedDeployPercentage   POST
media.upload                                    POST
```

A connected account cannot be asked "which extensions do you have?". The v1.1
discovery document is now a 404 — that API is retired, so there is no older
route either. Don't go looking for this again.

What *is* automated, since the id has to come from somewhere:

- **`parseItemId`** takes the store URL people actually copy (either host, with
  or without the name slug, devconsole links too) and pulls the id out.
- **`fetchStoreListingName`** reads the name off the **public listing page** —
  not the API, which returns versions and review state but never a title. A
  Draft-only item has no public page, so this returns null exactly in the case
  the watcher exists for, and the name is typed there.
- **`publisherId` lives on `StoreConnection`**, not on the extension: it is one
  value per account, so it is asked with the first extension and never again.

## The notification rules

In `decideNotification`, and deliberately quiet:

| State | When it sends |
|---|---|
| `NEEDS_ATTENTION` | Always, and again if it changes. This is the one that costs a release |
| `PUBLISHED` | On the change only |
| `DRAFT` | Only once it is **12 h** old — younger than that is just someone mid-release |
| `IN_REVIEW` | Only once it is **3 days** old |
| `UNKNOWN` | Never. An unreadable answer is not news, and must never read as good news |

`notifiedState` stops a repeat; `stateSince` only moves on a real change, so a
draft that has sat for a week keeps looking a week old.

Template: `extension_review_status`, spec in `WHATSAPP_TEMPLATES.md` §7. It
needs Meta approval before anything sends — until then the send fails silently
and the row still updates.

## Folding Google's states

`foldState` matches substrings, never an exact set. Google has renamed these
values before, and the failure has to be safe: an unrecognised value becomes
`UNKNOWN`, never `PUBLISHED`, or the watcher goes quiet in exactly the case it
exists for.

## Releasing from CI

`.github/workflows/release-extension.yml`. Fires on a push to `main` touching
`packages/extension/**`, and by hand from the Actions tab (with a bump choice
and a `dry_run` that builds and zips without submitting).

**No repo holds Chrome Web Store credentials.** The workflow carries one `gg_`
token and Glitchgrab does the talking, using the Google account connected in the
dashboard. That is what removes the four per-repo secrets, the 7-day
refresh-token expiry and the rotation cron.

```
push → infer bump from conventional commits
     → GET  /api/v1/extensions/release?bump=…   (next version, from the STORE)
     → stamp package.json + manifest.json
     → bun run zip
     → POST /api/v1/extensions/release          (zip; uploads + submits)
     → tag extension-vX.Y.Z
                        …hours later: cron/extension-watch → WhatsApp
```

Repo setup is one secret (`GLITCHGRAB_TOKEN`) and, optionally, a
`GLITCHGRAB_API_URL` variable to point at a preview deployment.

Three decisions worth keeping:

- **The store is the version source of truth**, not a git tag. practice-stack
  derives the version from its last tag and patches the JSON files at build time
  without committing them, so repo and store drift until a release is refused
  for a duplicate version. `GET /release` returns `max(published, submitted) + bump`,
  which cannot drift.
- **Upload and publish are one endpoint**, never two. An upload that is never
  submitted is the Draft trap this whole feature exists to catch.
- **A green tick means "submitted", nothing more.** The verdict lands hours or
  days later and reaches you on WhatsApp. This is the opposite of
  `PlasmoHQ/bpp@v3`, which returns a bare 400 on submissions that actually
  succeeded — which is why practice-stack's step is `continue-on-error: true`
  and its result means nothing at all.

Values that arrive over the network (the version, the bump) are passed through
`env:`, never interpolated into a `run:` line — a string spliced into `node -e`
is an injection waiting for the day the response is not ours.

### Two endpoint traps

- **Uploads go to a different host path.** `POST /v2/publishers/…/items/…:upload`
  makes Google parse the zip as JSON and answer *"Invalid JSON payload received.
  Unexpected token. PK\u0003\u0004"* — the zip's own magic bytes. The real path
  is `/upload/v2/…:upload?uploadType=media`, from the discovery document's
  `mediaUpload.protocols.simple.path`. The resource URL and the upload URL are
  not interchangeable.
- **The zip's root must be the manifest.** Zipping the folder produces
  `dist/manifest.json` inside the archive and the upload is refused with a
  message that never mentions nesting. `packages/extension/zip.ts` does
  `cd dist && zip …` for exactly this reason.

### Scope

Releasing needs the **write** scope (`chromewebstore`), not the read-only one
the watcher started with. A write-scoped connection can push a new version to
every existing user of every extension on that publisher account — which is the
argument for it living in one place you control rather than as copies of a key
file in every repo. An account connected before this change must be reconnected
to pick up the wider scope.

## Not built yet

Promoting the workflow to a **reusable** one in the org `.github` repo, so other
repos call it in three lines instead of copying it.
