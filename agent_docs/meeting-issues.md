# Issues from a call

Turns a recorded client call into draft GitHub issues you correct by talking at
them, then file. Entry point: the **"get issues from this call"** button on
`/org/<slug>/meetings/<id>`.

## Why it is shaped like this

A call is where the work gets decided; the transcript is where that decision
goes to die. The model reads the call and drafts one issue per thing that was
asked for — but the failure it has to survive is confident mistranslation.
Someone says "attendance" meaning a WhatsApp check-in, and a model that knows
what attendance *usually* means writes an issue about biometric hardware.

So nothing is auto-filed. Every draft carries the lines it was built from, and
every draft has a correction box: *"attendance here means WhatsApp check-in, not
a biometric device"* rewrites that one draft. Corrections are **per-draft** —
correcting one misunderstood feature must not get a chance to rewrite the four
drafts that were already right.

## Frames: why they are captured up front

The obvious design — transcribe, let the AI decide which moment needs a
screenshot, then go get it — cannot exist. By the time anything has an opinion,
the call is over and only audio was kept.

So the bot screenshots the Meet tab on a cadence *while recording*
(`packages/meet-bot/src/frames.ts`): one JPEG every 12s, decimated to ~300
frames on a long call (halve the set, double the interval), uploaded at the end
by presigned PUT. A few MB per call, versus GBs for video plus an ffmpeg pass
that cannot run on Vercel.

**Headless Chromium does composite live WebRTC into `page.screenshot()`** —
remote tiles and shared screens come out as real pixels. This was verified
before the pipeline was built; if frames ever come back black, that is the
regression to look for first, and the fix is headful under Xvfb (the Dockerfile
already installs it for `src/login.ts`).

Frames live in the **private** recordings prefix (`lib/recordings.ts`), never
`lib/s3.ts`. A still of a client's shared screen is a client conversation, and
the screenshot CDN is public-read. This is also why frames are **not** embedded
in the GitHub issue: the only way to show one there is a public URL.

## Pipeline

1. `POST /api/v1/meetings/:id/frames` — bot asks for presigned PUTs, uploads
   JPEGs itself. Rows written before upload (a missing object is a broken
   thumbnail; a missing row is a frame nobody can find).
2. `POST /api/v1/meetings/:id/issue-drafts` — gemini-2.5-pro **vision** over the
   transcript + ≤16 evenly-spread frames + the repo's open issue titles (dedupe).
   deepseek-v4-flash is the fallback and is text-only, so a fallback run loses
   the screenshots and says so. Only `DRAFT` rows are replaced on a re-run —
   filed is history, discarded is a decision.
3. `POST .../issue-drafts/:draftId/chat` — one correction, one draft, text only.
4. `PATCH/DELETE .../issue-drafts/:draftId` — hand edit; delete marks
   `DISCARDED` so a re-run does not resurrect it.
5. `POST .../issue-drafts/create` — the only irreversible step, and the only one
   a human presses. Creates the GitHub issue plus the `Report`
   (`source: MEETING`) + `Issue` rows every other flow uses, sequentially so a
   burst does not hit GitHub's secondary rate limit. One failure does not sink
   the batch.

## Guards

- **Every draft must quote the call.** `normaliseDraft` drops one that does not.
  It is the only invention guard that actually holds.
- **Cost**: `lib/meeting-issues/quota.ts` — calls read per repo per calendar
  month, module-private constant, same shape as `lib/ai-assist/quota.ts`.
  Re-reading the same call is free. 15 correction turns per draft, then the
  manual edit is the escape hatch.
- **Filing needs a filed call.** `Meeting.repoId` is nullable; an unfiled call
  can be read but has no repo to open issues in (`PATCH /meetings/:id/repo`).
