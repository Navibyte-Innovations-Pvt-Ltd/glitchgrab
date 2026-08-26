# GLITCH.md

The brief Glitchgrab's report assistant reads before it talks to anyone about
this project. CLAUDE.md is for whoever writes the code; this is for whoever is
stuck in the product.

The assistant answers from this file first. If the fix is written here, the
person gets the fix and goes back to work — nothing is filed. Only when the
answer is not here does it become a report. So the **Guides** section is the one
that earns its keep: every entry there is a report nobody has to write.

Keep it to a page. Anything longer stops being maintained, and only the first
~80 lines reach the model.

## What this product is

Glitchgrab turns messy bug input — a screenshot, a production error, someone
saying "the save button does nothing" — into a well-formed GitHub issue on the
repo it belongs to. An npm SDK for the host app, a web dashboard, a Chrome
extension, a desktop recorder, and an MCP server for coding agents.

## Roles

- **owner** — connected the repo. Sees every report, recording and setting.
  Pays the bill, and is the only one who can switch AI assist on.
- **tester** — QA on a magic link. Files only against the repos assigned to
  them, sees only their own activity. No billing, no org settings.
- **client / end user** — reports through the SDK inside someone else's app.
  Has no Glitchgrab account and will describe the host app, not us.
- **collaborator** — invited to one repo. Reads its reports; cannot change the
  repo or its tokens.

## Entities

- **repo** — one connected GitHub repository. Everything hangs off it.
- **token** (`gg_…`) — one repo's API key. One token is one repo, always. Not a
  login, not an OAuth token.
- **report** — what a person submitted. **issue** — what GitHub got. A report
  can exist with no issue (duplicate, failed).
- **feedback** — a 1–5 star rating an end user left about the *host* app. Never
  becomes an issue.
- **meeting** — a recorded client call, its transcript and its speakers.
- **project context item** — a note the team wrote about the repo, shown to the
  assistant alongside this file.

## Areas

- **Repos** — repo cards: tokens, report counts, the `ai report assist` toggle,
  sync from GitHub.
- **Chat** — the dashboard's own report composer.
- **Reports / Issues** — what was filed, and what became a GitHub issue.
- **Calls** — Meet recording, transcription, the Calls page.
- **Extension + GlitchRecord** — screen capture, the interaction log, the
  desktop recorder, the Report Bug dialog they share.
- **SDK** — `glitchgrab` inside someone else's Next.js app.
- **Billing** — Razorpay subscription and the paywall on `/org/<slug>`.

## Guides and fixes

- **The AI assistant does not appear.** It is off by default. The repo owner
  turns it on: Repos → the repo card → the `ai report assist` toggle. Only the
  owner sees that switch.
- **"Describe it with AI" is missing inside the dialog.** It shows once a report
  type is picked. The keyboard shortcut opens the assistant first, so this only
  happens on the plain form.
- **The assistant said it is unavailable.** Either the project hit its 50
  conversations for the month, or the model is down. The form underneath still
  works and files normally — nothing is lost.
- **A report did not reach GitHub.** Check the repo has the GitHub App
  installed: Repos → Connect Repo. A repo connected before the App migration
  needs reconnecting once.
- **Extension captured zero events.** The page must be reloaded after the
  extension is rebuilt; content scripts from the previous build keep running in
  open tabs until then.
- **Recording a call against a dev server does nothing.** The bot calls back to
  the API host, and `localhost` resolves to its own container. Use `bun run
  tunnel` and set `MEET_BOT_CALLBACK_URL`.
- **Testers cannot see a repo.** Assignment is per repo: Tester Activity → the
  tester → assign the repo. Org membership grants nothing on its own.

## Known limitations

- 50 assistant conversations per repo per calendar month, then it degrades to
  the plain form on purpose and says so.
- The Meet bot cannot run on Vercel — it needs a real browser and a sound
  server, so it ships as a container.
- `/dashboard` redirects owners into `/org/<slug>`. That is the routing, not a
  broken link.

## Don't report

- Anything on the marketing pages (`/`, `/features`, `/docs`) — static content,
  handled separately.
- "The AI wrote a bad description" on its own. The draft is editable before
  Send; report what it got wrong about the product instead.
- `Extension context invalidated` warnings after a rebuild. Reload the page.
