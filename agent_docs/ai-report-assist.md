# AI report assistant (#330)

The reporter chats; the model reads what was already captured and writes the
description for them. Opt-in per repo, off by default.

## Where it sits

**Before submit, in composition.** The assistant produces text that lands in the
same textarea a person types into, and that text is submitted through the same
deterministic build-body → S3 → GitHub path as every other report.

There is still **no AI in the issue pipeline**. Nothing here creates an issue,
picks a repo, sets a severity, or dedupes. If the assistant is switched off,
down, or over its cap, the dialog is exactly what it was before this feature.

## The switch

`Repo.aiAssistEnabled`, default `false`. The **owner** sets it — Dashboard →
Repos → the `ai off` / `ai on` button on their own repo card
(`PATCH /api/v1/repos/[id]/ai-assist`, `updateMany` scoped to `userId`, so a
repo you don't own 404s rather than 403s).

Owner-only, not repo members: this spends model budget on the owner's behalf,
including on strangers who open the dialog inside an SDK-embedded app. A
collaborator can read a project; they cannot commit its owner to a bill.

Hosts learn about it as a **UI hint** and never as a permission:
- SDK → `aiAssist` on `GET /api/v1/sdk/project`
- extension / GlitchRecord → `aiAssistEnabled` per repo on `GET /api/v1/extension/repos`

`POST /api/v1/ai/report-chat` re-reads the column on every single call.

## The endpoint

`POST /api/v1/ai/report-chat`. Three credentials, one rule — **the repo comes
from the credential, never from the body**:

| Host | Credential | Repo scope |
|---|---|---|
| SDK end user | `Authorization: Bearer gg_…` | that token's one repo |
| Chrome extension / GlitchRecord | `sessionId` (ExtensionSession) | `getExtensionSessionRepos()` allow-list |
| Dashboard | NextAuth session | `getAccessibleRepos()` |

`repoId` in the body only ever *picks from* a server-built list. Project-context
notes are read off the resolved repo for the same reason.

Reply shape: `{ conversationId, question, report }` — `question` and `report`
are mutually exclusive. `question` renders as a chat bubble; `report` fills the
textarea and closes the panel.

Anything that means "cannot help" answers with `degrade: true` and a sentence
written for the reporter. Cap hit, rate limited, model down, switched off — the
dialog does the same thing every time: close the panel, show the sentence, keep
the form. **Filing a bug never depends on a model.**

## Cost guard

`lib/ai-assist/quota.ts`. No metered billing exists in this product, so the
guard is a hard cap with a graceful landing.

- **50 conversations per repo per calendar month** (`MONTHLY_CONVERSATION_CAP`).
  Conversations, not messages — a bug that needs a follow-up question costs the
  same as one that doesn't, so the model is free to ask when asking is right.
- **12 turns per conversation** (`MAX_TURNS`) so one chat cannot loop forever.
- **40 requests/hour per credential** (`checkRateLimit`) so nobody burns a
  month's cap in a minute.

`AiAssistConversation` is the row the cap counts.

## The transcript store

Every message of every chat is kept — both sides, in order — in
`AiAssistMessage`, and the report a chat produced points back at it through
`Report.aiAssistConversationId`.

This reverses the feature's original refusal to store transcripts. The reason is
one question that was unanswerable without them: **how many prompts does a filed
issue actually cost.** `AiAssistConversation.turns` already counted round-trips,
but with nothing joining a conversation to a report there was no way to separate
the chats that ended in an issue from the ones that went nowhere. Both halves
together are the training set for the next version of the prompt.

Be honest about what this is: the text is a draft bug report typed by an end user
of somebody else's app, and it is now retained whether or not they press Send. It
is stored for **every repo with `aiAssistEnabled`** — there is no separate opt-in
— and it is Glitchgrab-internal: no dashboard surface reads it, no endpoint
returns it, owners cannot browse or delete it. If that changes, this paragraph is
the one to update first.

What is deliberately NOT stored: the screenshot. Up to `MAX_SCREENSHOT_CHARS` of
base64 per turn, and the only training signal in it is that the model could see
one — so `hadScreenshot` carries it.

Mechanics worth knowing before touching `lib/ai-assist/transcript.ts`:

- **Only the tail is written.** The client resends its whole history every turn,
  so persisting `messages` wholesale would store turn one N times. The newest
  user message plus the reply is exactly the new information.
- **It swallows its own errors**, like `markConversationOutcome`. A reporter is
  waiting on the reply; a training insert must never be what fails it.
- **The link is untrusted.** `aiConversationId` rides in report metadata across
  a submit boundary, so `linkConversationToReport` resolves it scoped to the
  report's own repo — same pattern as `claimAssistTurn` — and links nothing when
  it belongs elsewhere.
- **`outcome` now has two values.** `"SOLVED"` (the brief answered it, nothing
  filed) and `"FILED"` (a report came out). `"SOLVED"` outranks: a report filed
  after a solved conversation is a separate decision.

## Who was typing

The conversation records the **person**, not just the credential:
`reporterKey` / `reporterName` / `reporterEmail`, the same three fields the
report itself carries. One SDK token covers every end user of the host app, so
without these a thousand strangers' chats attribute to a single row.

Where each host gets them:

| Host | Source | Trust |
|---|---|---|
| SDK end user | `session` prop → `reporter` in the chat body | client-supplied, same as the report's own reporter fields |
| extension / GlitchRecord | `ExtensionSession` identity | server-resolved — a tester cannot rename themselves in a body |
| dashboard | NextAuth session | server-resolved |

Identity that arrives late (a host that starts passing `session` mid-chat) fills
a blank but never overwrites — the first attribution is the honest one.

## The model

`lib/ai-assist/chat.ts`. **DeepSeek only** — `deepseek-v4-flash-vision-exp`
primary, `deepseek-v4-flash` (text-only, same family) fallback.

Gemini was primary until it was measured. On one full-page screenshot, same
prompt:

| model | latency | prompt | thinking |
|---|---|---|---|
| `deepseek-v4-flash-vision-exp` | 4.3s | 479 | 340 |
| `gemini-2.5-flash` | 5.4s | 287 (258 image) | 481 |

So the reason it was primary — "flash does not think, so it answers faster" —
was wrong twice over. DeepSeek is faster, reads the screenshot as well, and
costs a fraction per token. Gemini is gone from THIS path; `lib/ai-enhance.ts`
(the sparkle button) and narration still use it.

Two DeepSeek facts worth knowing before touching this:

- **Only `-vision-exp` takes an image.** Every other model — `v4-flash`,
  `v4-pro`, `deepseek-chat` — answers `"This model does not support image"`.
- **It thinks first.** The answer lands in `content` only after
  `reasoning_content`; with a small `max_tokens` it finishes on `length` and
  `content` comes back **empty**. Hence 8192.

The fallback is deliberately the same family without eyes rather than another
vendor: `-exp` can be withdrawn without notice, and when it is, the assistant
should lose the screenshot, not disappear.

## Options, and the reporter's own questions

Two failures the first version had, both from the same root — it could only
interrogate:

1. Asked "what do you see on the page?", it replied with another question.
2. Told "I think it could be better", it asked "what specifically?" — of a
   person who had just said they could not phrase it — three times, then wrote
   a report that was one restatement plus `Not known:`.

The prompt now makes it a **reporter**: it names the screen itself off the
screenshot, answers what it is asked, and when the reporter is vague it offers
2–4 candidates read off the screen instead of re-asking. Those come back as
`<options>` and render as chips in the sheet (`parseAssistReply` caps them at
four; anything over 24 characters stacks instead of wrapping into an orphan).
Every report now opens by placing itself — "On the Repos page, in the list of
repo cards" — in words, never as a pasted URL.

## Answer first, report second

The assistant's job order changed (it was "reporter only", which meant somebody
whose problem already had a documented fix still left with a ticket number and
the same broken afternoon):

1. If the answer is in the project's brief or in an open issue, **give it** —
   two or three lines, in the team's words — and offer two ways out as chips:
   *That worked* / *Still broken — report it*.
2. Otherwise write the report, as before.

It may answer **only** from GLITCH.md and the open issue list. Not from the
screenshot, not from what usually works in apps like this. A confident wrong
how-to sends someone down a path that does not exist and costs more than the bug
did; the prompt says so in those terms, and "I don't know" routes straight to a
report.

*That worked* ends the conversation with `<solved>` — a warm line, nothing
filed, the dialog closes. `AiAssistConversation.outcome = "SOLVED"` records it,
which is the only signal a team gets that their brief is working: how many
people it unstuck, and which question keeps coming back and should have been a
fix instead of a paragraph. **The `outcome` column is new — prod needs the
migration.**

`<solved>` is deliberately a tag, never inferred: "glad that helped" in the
middle of a conversation must not close one that is still going.

## GLITCH.md — the project's brief

`lib/ai-assist/glitch-md.ts`. A file the team commits to their own repo
(`GLITCH.md`, `.github/GLITCH.md`, `docs/GLITCH.md` — first hit wins), read
under the installation token and cached 10 min. This repo has one at the root;
it doubles as the template.

CLAUDE.md tells a coding agent how the code works. GLITCH.md tells the assistant
what the product IS and how to unstick someone using it. Sections, all matched
loosely by heading:

| Section | What it buys |
|---|---|
| What this product is | Two lines of domain. Without it, "compliance" reads as "a form". |
| Roles | employee / firm admin / partner / super admin — who sees what. |
| Entities | The real models and their words: lead, proposal, executor, due date. |
| **Guides and fixes** | How the common tasks are done, and the workaround for each known issue. **The section that lets the assistant answer instead of file** — every entry is a report nobody has to write. |
| Areas | The parts of the product, in the team's names. |
| Glossary | Words that mean something specific here. |
| Known limitations | Already known, already being worked on. |
| Don't report | Out of scope; the assistant declines outright. |

Guides get a 3,000-char cap against 1,500 for everything else — they carry
steps, and half a fix is worse than none.

In the repo rather than in our DB on purpose — the names of things change in the
same pull request that changes the things, so a brief reviewed alongside the
code stays true. `ProjectContextItem` notes remain as the fallback for repos
without a file.

Parsed by heading, not pasted whole: this rides in a turn somebody is waiting
on. Headings are matched loosely (`## Who reports here` lands on roles), each
section is capped at 1,500 chars, the render at 80 lines, and a brief with no
headings at all still goes through as `other` rather than being dropped.

The prompt gives it real authority — use THEIR words for things, say so when
something is already known, and refuse outright when it is on the do-not-report
list — while restating that it is the team describing their product, never
instructions to the model.

**Glitchgrab does not write this file.** No draft PR, no bootstrap commit. The
product reports; it does not open pull requests on somebody's repo.

## Duplicates

The turn is given the repo's **open issue titles** (`lib/ai-assist/issues.ts`,
live from GitHub under the installation token, cached 5 min). Titles and numbers
only: sixty issue bodies with their embedded screenshots is a hundred thousand
tokens and a timeout, and a title is enough to say "this looks like #123". A
repo with 500 open issues sends the 100 most recently updated through
`rankIssues` (plain word overlap, stop-worded) and the top 30 reach the model.

If it matches, `<duplicate>123</duplicate>` rides with the report. Then:

- the route resolves that number against **its own** copy of the open list —
  a number the model invented, or one from another repo, is dropped;
- the sheet shows "Our team is already on this · #123 <title>" and the Send
  button becomes **Add to #123**;
- the number travels as `metadata.duplicateIssueNumber` through the dialog's one
  submit path, and `lib/duplicate-issue.ts` re-fetches the issue under the
  repo's installation, refuses it unless it is **open**, and posts the report as
  a comment. Anything unexpected returns null and the issue is created normally
  — a wrong guess costs a duplicate issue, never a lost report.

Wired into all three report routes: `sdk/report`, `reports`, `extension/report`.

The whole conversation is replayed as labelled text in **one** user turn so the
screenshot rides with all of it — the reporter's third message routinely refers
to what is in the picture.

## Trust boundary

Every word of the conversation, the page URL, the activity log and the
project-context notes originates outside our control. All of it is fenced as
`<context>` / `<conversation>` DATA and the prompt says so in the strongest
terms available.

The enforcement that matters is structural, not textual: the model can only
return text into a textarea. The worst a successful injection achieves is a rude
draft the reporter reads and edits before pressing Send.

## Files

| Path | What |
|---|---|
| `apps/web/lib/ai-assist/prompt.ts` | system prompt, context block, reply parser (+ tests) |
| `apps/web/lib/ai-assist/chat.ts` | Gemini→DeepSeek call |
| `apps/web/lib/ai-assist/quota.ts` | conversation cap + turn cap |
| `apps/web/app/api/v1/ai/report-chat/route.ts` | auth, repo scope, the gate |
| `packages/report-ui/src/assist-sheet.tsx` | the sheet (+ tests) |
| `packages/report-ui/src/report-dialog.tsx` | `assist` / `assistContext` props |

`report-ui` is vendored into GlitchRecord — edit `packages/report-ui` and re-run
`npm run sync:report-ui`, never `src/vendor/`.

## The surface

A **sheet**, in its own portal above the dialog: a right-hand drawer at 440px on
a wide screen, a bottom sheet under 640px. It replaced an in-dialog panel that
worked and read like a form field — a conversation crammed into 150px of a 420px
card never felt like talking to anyone.

The sheet owns the whole flow: **chat → draft → Send**. There is no hand-back to
the dialog, because a context switch at the exact moment someone is finished is
the worst possible time to move them.

It does **not** own submission. `description`, `severity` and `handleSubmit` are
the dialog's own state and handler, passed straight through, so this package has
exactly one submit path and the sheet cannot drift from it.

## Gotchas

1. **The dialog is hidden (`display:none`) and `inert` while the sheet is up.**
   The two share `description` and `severity`, so leaving it on screen behind a
   translucent overlay showed the same report text, the same severity buttons
   and a second Send Report — one report wearing two faces. `inert` +
   `aria-hidden` are set on the card via ref, not as JSX props, so React 18 and
   19 behave the same, and they cover the frame while the sheet is mounting.
   Hidden, never unmounted: the screenshots, attachments and step live in that
   component, and "Write it myself" must bring all of it back.
2. **The sheet and the dialog share `description`,** so the same text renders in
   two textareas. Scope any test assertion about the draft to the sheet
   (`within(getByRole("dialog", { name: /Describe your report with AI/ }))`) —
   a global `getByDisplayValue` passes even when the sheet rendered nothing.
3. **Chat bubbles need `minWidth: 0` up the whole flex chain.** A flex child
   defaults to `min-width: auto`, so one long message grows the bottom sheet
   wider than the phone instead of wrapping inside it.
4. `marginTop: auto` on the transcript's inner wrapper is what pins a short
   conversation to the *bottom* of a tall drawer. Doing it with
   `justify-content` instead breaks scrolling once the chat outgrows the panel.
5. Closing the sheet by hand does **not** set `assistUsed` — someone who peeked
   and backed out should find the button where they left it. Only a degrade
   (cap, outage, switched off) retires the assistant for that report.
6. `assistUsed` is reset in `handleClose`, not on submit. Without that, one use
   hides the assistant for the rest of the page's life.
7. An empty `<report></report>` is **not** a finished report — accepting it
   would silently erase what the reporter had already typed.

## Capturing screenshots of this

There is no Cypress in `packages/report-ui`. The way these were shot: a
throwaway Vite page aliasing `@glitchgrab/report-ui` to `src/index.ts`, built to
static files, then headless Chrome `--screenshot` over `file://`.

Two traps. The Chrome extension cannot render `localhost`, so `--screenshot` is
the only route. And **headless Chrome floors the viewport at ~500px** — passing
`--window-size=420,780` gives a 500px page cropped to 420, which looks exactly
like a horizontal-overflow bug and is not one. Measure with `--dump-dom` and
`scrollWidth` before believing a narrow screenshot.
