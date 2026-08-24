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

**The watcher.** `StoreExtension` rows hold the item id, publisher id and an
encrypted service-account key. `cron/extension-watch` (every 30 min) polls each
one and sends WhatsApp when — and only when — a human has something to do.

| File | Job |
|---|---|
| `lib/chrome-store.ts` | Service-account auth, `:fetchStatus`, folding Google's vocabulary into our five states |
| `lib/extension-watch.ts` | When a state change is worth a message. `decideNotification` is unit-tested — it is the whole feature |
| `app/api/v1/cron/extension-watch/route.ts` | The sweep |
| `app/api/v1/extensions/` | Register, list, delete |

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

## Setting up the service account

Already done on the `GlitchGrab` Cloud project (24 Aug 2026):

- **Chrome Web Store API** — enabled.
- **Service account** — `glitchgrab-cws-watcher@glitchgrab.iam.gserviceaccount.com`,
  no GCP IAM role: store permission comes from the publisher account, not Cloud IAM.

What is left needs a human, because both steps handle the private key itself:

1. ~~Cloud console → **APIs & Services → Library** → enable **Chrome Web Store API**.~~ done
2. **IAM & Admin → Service Accounts → glitchgrab-cws-watcher → Keys → Add key → JSON**. Download it.
3. CWS developer dashboard → **Account → Users** (a *group* publisher account is
   required; a personal publisher account cannot add users) → invite the service
   account's `client_email` as a user with publish rights.
4. Paste the JSON into Glitchgrab when registering the extension. It is
   encrypted with `ENCRYPTION_KEY` (AES-256-GCM, same as user AI keys) and never
   read back out through the API.

Step 3 is the one that catches people: without it every call returns 403 and
the row just records the error.

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

## Not built yet

The **publish side** — a reusable org-level workflow that reads the live store
version, bumps `package.json` + `manifest.json`, tags, zips, uploads and
submits, so no repo carries its own release logic. The pieces it must not
repeat, taken from practice-stack's `release-extension.yml`:

- `PlasmoHQ/bpp@v3` returns a bare **400** on a submission that actually
  succeeded, so the step is `continue-on-error: true` and its result means
  nothing. Call the v2 API directly instead.
- Version lives in the git tag and is patched into the JSON files at build time
  only, so the committed version numbers drift from what is on the store.
