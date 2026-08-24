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

`AiAssistConversation` is the row the cap counts. It stores **no message
bodies** — the transcript is a draft bug report typed by an end user of somebody
else's app, and it is already persisted, with consent, the moment they press
Send. A second copy of every abandoned draft buys nothing and is a liability.

## The model

`lib/ai-assist/chat.ts`. gemini-2.5-flash primary (it sees the screenshot),
deepseek-v4-flash fallback (text only, so a screenshot-only report degrades to
"tell me what went wrong" rather than to an error).

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
