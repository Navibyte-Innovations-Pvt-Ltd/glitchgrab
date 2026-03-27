# Glitchgrab

**Grab the glitch. Ship the fix.**

Glitchgrab turns messy bug reports — screenshots, production errors, user complaints — into well-structured GitHub issues using AI.

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

## Three Components

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

## Competitive Landscape

| Tool                                          | What it does                                                                            | Pricing           | Limitations                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| **[Jam.dev](https://jam.dev)**                | Chrome extension for instant bug reporting with screenshots, console logs, network data | Free + paid tiers | Browser extension only, no SDK, no AI issue generation                      |
| **[Marker.io](https://marker.io)**            | Website feedback widget with annotations, metadata capture                              | From $39/mo       | Focused on visual feedback/QA, no error auto-capture SDK, no AI generation  |
| **[BetterBugs](https://betterbugs.io)**       | Chrome extension + Web SDK for screenshot/screen recording with AI debugging assistant  | Free tier + paid  | Has SDK but focused on manual reporting, AI is for debugging not generation |
| **[Sentry](https://sentry.io)**               | Full observability platform — error tracking, performance, session replay               | Free tier + paid  | Heavyweight, no AI issue creation, doesn't create GitHub issues auto        |

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
│   ├── web/                    # Next.js dashboard + API
│   └── mobile/                 # React Native (Expo) mobile app
├── packages/
│   ├── sdk-nextjs/             # glitchgrab npm package
│   ├── mcp-server/             # MCP server for Claude
│   └── shared/                 # Shared types
├── CLAUDE.md                   # Instructions for Claude Code
├── README.md
├── package.json
└── turbo.json
```

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
- [x] SDK: Report Error button
- [x] Dashboard: Upload screenshots
- [x] AI deduplication check
- [ ] MCP server
- [ ] Mobile app (Android + iOS)
- [ ] Linear + Jira support
- [ ] Multi-framework SDK (React, Vue)

## License

MIT

---

Built by [Navibyte Innovation Pvt. Ltd.](https://github.com/webnaresh)
