# @glitchgrab/meet-bot

A headless Chromium that joins a Google Meet call as a guest, records the audio,
and hands it to Glitchgrab. The tldv-style notetaker, self-hosted — nothing
leaves your infrastructure except what you already send to S3 and Sarvam.

## Why it is a separate service

It needs a real browser and a sound card for the length of a meeting. That rules
out Vercel and every other function platform: **this cannot be a Next.js route.**
Run the container on Railway, Fly, Hetzner, EC2 — anywhere that will keep a
process alive for an hour.

## How the recording actually works

A container has no speakers, so there is nothing to record until you give it
one. PulseAudio's **null sink** is a virtual speaker: it discards what it plays
but exposes a `.monitor` source carrying the identical samples.

```
Chromium ──plays the call──► glitchgrab_sink ──.monitor──► ffmpeg ──► tab.webm
```

Opus in WebM — the same format the browser extension produces, so the server
needs no branch for bot vs extension recordings, and Sarvam takes it directly
with no conversion step.

## The bot needs a Google account

Google Meet **refuses anonymous participants** on Workspace-hosted meetings —
not "ask to join", a flat *"You can't join this video call"*. So the bot has to
be somebody. Give it a dedicated account, ideally a user inside your own
Workspace (`notetaker@yourdomain.com`), so it joins as an org member instead of
a stranger and you never have to loosen access for every meeting.

**The bot never logs in.** Automating a Google sign-in is precisely what bot
detection is built to catch, and it breaks unpredictably. Instead a human signs
in once, in a real browser, and the bot replays that session:

```bash
cd packages/meet-bot
bun run seed-auth          # opens Chrome — sign in as the bot account
```

Press Enter when done and it prints a base64 blob. Set it on the Railway
service:

```
GOOGLE_STORAGE_STATE=<the base64 blob>
```

That blob is a **live credential** — it signs in as that account. Never commit
it (`google-state.json` is gitignored), and use a dedicated account.

### Keeping the session alive

Google rotates cookies as a session is used. Mount a Railway volume and set:

```
GOOGLE_STATE_PATH=/data/google-state.json
```

The bot then writes the refreshed session back after every call, which is the
difference between a login that dies in weeks and one that lasts. Without a
volume it still works — the env var is just frozen at seed time.

When the session finally expires, the failure says so explicitly
("re-run `bun run seed-auth`") rather than looking like a broken selector.

## Run it

```bash
docker build -t glitchgrab-meet-bot .
docker run -d -p 8080:8080 \
  -e MEET_BOT_SECRET="<same value as the web app>" \
  -e MEET_BOT_NAME="Glitchgrab Notetaker" \
  -e MEET_BOT_MAX_CONCURRENT=2 \
  glitchgrab-meet-bot
```

Then point the web app at it:

```
MEET_BOT_URL=https://your-bot-host
MEET_BOT_SECRET=<the same secret>
```

`MEET_BOT_SECRET` is the only credential. The bot can finish a recording that a
scoped user already created; it can never create one, so a leaked secret cannot
file calls against arbitrary projects.

## Sizing

One meeting is one Chromium: roughly 1–2 vCPU and ~1 GB. `MEET_BOT_MAX_CONCURRENT`
is a real ceiling, not a formality — oversubscribing degrades every call at once,
and a degraded recording is worse than a refused one.

## API

```
POST /join   { meetingId, meetUrl, apiBase }   header: x-gg-bot: <secret>
GET  /health
```

`/join` returns immediately and the bot works in the background, reporting
progress to `POST /api/v1/meetings/:id/bot-status`.

## The part that will break

Google Meet's DOM is obfuscated and changes without notice. Every selector in
`src/meet.ts` is written against **accessible names** (`Ask to join`,
`Leave call`) rather than CSS classes, because those are what Google keeps
stable for screen readers. It is still the fragile half of this service.

If the bot stops joining, that file is where to look — and the failure will be
visible as `botStatus: FAILED` with the reason on the meeting, not a silent
nothing.

Note also: the bot hears **one mixed stream**, exactly like a human participant.
Speaker names come from the participant list and Meet's captions, the same way
the extension gets them — joining the call does not hand you per-speaker audio.
