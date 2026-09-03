# Glitchgrab

**Grab the glitch. Ship the fix.**

[![npm](https://img.shields.io/npm/v/glitchgrab)](https://www.npmjs.com/package/glitchgrab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/blob/main/LICENSE)

Glitchgrab turns messy bug reports — screenshots, production errors, user complaints — into well-structured GitHub issues using AI.

**npm:** [`npm install glitchgrab`](https://www.npmjs.com/package/glitchgrab) | **Website:** [glitchgrab.dev](https://glitchgrab.dev) | **SDK Docs:** [packages/sdk-nextjs/README.md](packages/sdk-nextjs/README.md)

## What Makes Glitchgrab Different?

There are existing tools in this space (see [Competitive Landscape](#competitive-landscape)), but Glitchgrab combines **unique capabilities** that no single tool offers today:

| Capability                               | Jam.dev | Marker.io | BetterBugs | Sentry | **Glitchgrab** |
| ---------------------------------------- | ------- | --------- | ---------- | ------ | -------------- |
| Screenshot → GitHub issue                | ✅      | ✅        | ✅         | ❌     | ✅             |
| SDK auto-captures production errors      | ❌      | ❌        | Partial    | ✅     | ✅             |
| End-user "Report Error" button           | ❌      | Widget    | Widget     | ❌     | ✅             |
| AI-generated issue (title, body, labels) | ❌      | ❌        | AI assist  | ❌     | ✅             |
| Dedup check before creating issue        | ❌      | ❌        | ❌         | ✅     | ✅             |
| MCP server (Claude integration)          | ❌      | ❌        | ❌         | ❌     | ✅             |
| Open source                              | ❌      | ❌        | ❌         | ✅     | ✅             |

### Key differentiators

1. **AI-first issue generation**: Not just AI-assisted — the AI writes the entire issue (title, description, labels, severity) from raw input.
2. **Smart dedup & merge**: AI compares new reports against open issues. Similar bugs get added as comments, not new issues.
3. **MCP server**: Query and create issues from Claude directly. No other bug tool has this.
4. **Open source**: Full codebase available. Built by developers, for developers.

## Components

### 1. SDK (`glitchgrab`)

```tsx
// app/layout.tsx
import { GlitchgrabProvider } from "glitchgrab";

export default function RootLayout({ children }) {
  return (
    <GlitchgrabProvider token="gg_your_token">{children}</GlitchgrabProvider>
  );
}
```

- Auto-captures unhandled errors with full context (visited pages, stack, screenshot)
- `glitchgrab/server` — the same pipeline for cron jobs, API routes and workers, where no browser exists
- Adds a "Report Error" button for end-users
- Non-blocking — never crashes the host app

### 2. Web Dashboard

- Connect GitHub repos, generate tokens (one token = one repo)
- Upload screenshots → AI creates issues
- Chat-based issue creation — describe a bug, AI handles the rest
- View all reported issues across repos
- Available at [glitchgrab.dev](https://glitchgrab.dev)

### 3. MCP Server

- Connect to Claude Desktop or any MCP client
- "What bugs were reported on my-app today?"
- "Create a feature request for dark mode"

### 4. Screen Recording → Tutorial + Issue (GlitchRecord + Chrome Extension)

- **GlitchRecord** (`apps/glitchrecord`) — desktop screen recorder/editor (a
  Recordly fork) that pairs with a **Chrome extension** (`packages/extension`)
  over a local WebSocket bridge.
- The extension captures what you clicked/typed/navigated while GlitchRecord
  records your screen; on stop, that turns into an AI-narrated tutorial script
  and can auto-create a GitHub issue.
- **Report Bug** — a QA tester (or the dashboard owner) can also file a bug
  with no recording at all, using the same dialog UI as the SDK's
  `ReportButton` (`packages/report-ui`), with work-time tracked for the audit
  log. It lives in **GlitchRecord** so it captures the whole screen and works
  no matter which browser (or native app) the tester was in; the Chrome
  extension offers the same button for Chrome tabs. Both share one identity
  model and one API endpoint.
- Also available as a mobile app (Android + iOS) — see `apps/mobile`.

## For testers — installing GlitchRecord

If someone asked you to test their app and report bugs, this is all you need.
You do **not** need to clone this repo, install Node, or use Chrome.

### 1. Download

**→ [glitchgrab.dev/download](https://glitchgrab.dev/download)**

The page detects your OS and gives you one button. (Direct links live on the
[releases page](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchrecord/releases)
if you'd rather pick a build yourself.)

| Your machine        | File                              |
| ------------------- | --------------------------------- |
| Mac (M1–M4)         | `GlitchRecord-arm64.dmg`          |
| Mac (Intel)         | `GlitchRecord-x64.dmg`            |
| Windows 10 / 11     | `GlitchRecord-windows-x64.exe`    |
| Linux               | `GlitchRecord-linux-x64.AppImage` |

### 2. Install

- **Mac** — open the `.dmg`, drag **GlitchRecord** into **Applications**. Then
  open Terminal and paste this once:

  ```bash
  xattr -cr /Applications/GlitchRecord.app
  ```

  > **Why?** The app isn't notarized by Apple yet, so macOS claims it is
  > *"damaged and can't be opened"*. It isn't — that command just clears the
  > download quarantine flag. You only ever do this once.

- **Windows** — run the `.exe`. SmartScreen may warn you: click
  **More info → Run anyway**.
- **Linux** — `chmod +x GlitchRecord-linux-x64.AppImage`, then run it.

### 3. Sign in

- **QA testers** — open the QA link your team sent you **in whatever browser you
  normally use** (Chrome, Firefox, Safari, Edge — any of them), then press
  **"Open in GlitchRecord"**. Confirm the prompt showing your name. Done.
- **Everyone else** — press **Connect Glitchgrab** in the app and sign in with
  GitHub.

### 4. Report a bug

Press **Report Bug** in the app header. It screenshots your whole screen —
whatever browser or app you were testing — then you write what went wrong, pick
the repo, and submit. A GitHub issue is filed under your name.

Press **New Recording** instead if the bug is easier to show than describe;
GlitchRecord narrates the recording and can open the issue from it.

> **Do I need the Chrome extension?** No. It only adds click-and-keystroke
> logging inside Chrome tabs during a recording. Everything above works
> without it — which is exactly why testers who use more than one browser
> should use the desktop app.

## Competitive Landscape

| Tool                                    | What it does                                                                            | Pricing           | Limitations                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| **[Jam.dev](https://jam.dev)**          | Chrome extension for instant bug reporting with screenshots, console logs, network data | Free + paid tiers | Browser extension only, no SDK, no AI issue generation                      |
| **[Marker.io](https://marker.io)**      | Website feedback widget with annotations, metadata capture                              | From $39/mo       | Focused on visual feedback/QA, no error auto-capture SDK, no AI generation  |
| **[BetterBugs](https://betterbugs.io)** | Chrome extension + Web SDK for screenshot/screen recording with AI debugging assistant  | Free tier + paid  | Has SDK but focused on manual reporting, AI is for debugging not generation |
| **[Sentry](https://sentry.io)**         | Full observability platform — error tracking, performance, session replay               | Free tier + paid  | Heavyweight, no AI issue creation, doesn't create GitHub issues auto        |

### Where Glitchgrab fits

Glitchgrab is **not** trying to be Sentry (full observability) or Marker.io (agency feedback workflows). It's a focused tool that solves one problem: **the gap between noticing a bug and having a well-written GitHub issue**.

## Tech Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 15 (App Router)      |
| Database        | Neon (Serverless PostgreSQL) |
| ORM             | Prisma                       |
| Auth            | NextAuth.js (GitHub OAuth)   |
| AI              | Claude API + OpenAI API      |
| Deployment      | Vercel                       |
| Monorepo        | Turborepo                    |
| Package Manager | bun                          |

## Project Structure

```
glitchgrab/
├── apps/
│   ├── web/                    # Next.js 15 dashboard + API — deployed to glitchgrab.dev
│   ├── mobile/                 # React Native (Expo) mobile app — WebView wrapper around web
│   ├── glitchrecord/            # Electron screen recorder/editor (Recordly fork) + GlitchBridge
│   └── scripts/                 # db-sync.ts — pull prod DB into local
├── packages/
│   ├── sdk-nextjs/              # glitchgrab npm package (Next.js SDK)
│   ├── sdk-expo/                # @glitchgrab/sdk-expo (React Native SDK)
│   ├── report-ui/               # shared "report a bug" dialog — used by sdk-nextjs AND the extension
│   ├── extension/               # Chrome MV3 extension — capture pipeline + tester Report Bug
│   └── recordly-extension/      # in-app GlitchRecord plugin — AI narration script generator
├── CLAUDE.md                    # Instructions for Claude Code
├── README.md
├── package.json
└── turbo.json
```

MCP server integration is planned but not yet built as a standalone package
(see Roadmap).

## Getting Started

```bash
git clone https://github.com/webnaresh/glitchgrab.git
cd glitchgrab
bun install
cp apps/web/.env.example apps/web/.env.local
# Fill in your keys
bun run dev
```

## Roadmap

- [x] GitHub OAuth + repo connection + token generation
- [x] AI pipeline: image/text → structured GitHub issue
- [x] SDK: Error boundary + auto-capture
- [x] SDK: Report Error button + keyboard shortcuts (Cmd+Shift+G, Cmd+V paste)
- [x] Dashboard: Upload screenshots
- [x] AI deduplication check
- [x] Mobile app (Android + iOS)
- [ ] MCP server
- [ ] Linear + Jira support
- [ ] Multi-framework SDK (React, Vue)

## License

MIT

---

Built by [Navibyte Innovation Pvt. Ltd.](https://github.com/webnaresh)
