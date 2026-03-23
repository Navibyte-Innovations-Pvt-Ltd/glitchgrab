# Glitchgrab

**Grab the glitch. Ship the fix.**

Glitchgrab turns messy bug reports — handwritten notes, screenshots, production errors, user complaints — into well-structured GitHub issues using AI.

## What Makes Glitchgrab Different?

There are existing tools in this space (see [Competitive Landscape](#competitive-landscape)), but Glitchgrab combines **four unique capabilities** that no single tool offers today:

| Capability                               | Jam.dev | Marker.io | BetterBugs | Sentry | **Glitchgrab** |
| ---------------------------------------- | ------- | --------- | ---------- | ------ | -------------- |
| Screenshot → GitHub issue                | ✅      | ✅        | ✅         | ❌     | ✅             |
| Handwritten notes → AI → issue           | ❌      | ❌        | ❌         | ❌     | ✅             |
| SDK auto-captures production errors      | ❌      | ❌        | Partial    | ✅     | ✅             |
| End-user "Report Error" button           | ❌      | Widget    | Widget     | ❌     | ✅             |
| AI-generated issue (title, body, labels) | ❌      | ❌        | AI assist  | ❌     | ✅             |
| Dedup check before creating issue        | ❌      | ❌        | ❌         | ✅     | ✅             |
| MCP server (Claude integration)          | ❌      | ❌        | ❌         | ❌     | ✅             |
| Open source                              | ❌      | ❌        | ❌         | ✅     | ✅             |
| BYOK (Bring Your Own AI Key)             | ❌      | ❌        | ❌         | ❌     | ✅             |

### Key differentiators

1. **Handwritten note → issue**: No tool does this. Developers scribble ideas in notebooks — Glitchgrab turns photos of those notes into structured issues.
2. **AI-first issue generation**: Not just AI-assisted — the AI writes the entire issue (title, description, labels, severity) from raw input.
3. **MCP server**: Query and create issues from Claude directly. No other bug tool has this.
4. **Open source + BYOK**: Bring your own Claude or OpenAI key, or use platform-provided AI.

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
- Upload screenshots or handwritten note photos → AI creates issues
- View all reported issues, configure AI provider
- Available at [glitchgrab.dev](https://glitchgrab.dev)

### 3. MCP Server

- Connect to Claude Desktop or any MCP client
- "What bugs were reported on my-app today?"
- "Create a feature request for dark mode"

## Competitive Landscape

| Tool                                          | What it does                                                                            | Pricing           | Limitations                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| **[Jam.dev](https://jam.dev)**                | Chrome extension for instant bug reporting with screenshots, console logs, network data | Free + paid tiers | Browser extension only, no SDK, no AI issue generation, no handwritten notes    |
| **[Marker.io](https://marker.io)**            | Website feedback widget with annotations, metadata capture                              | From $39/mo       | Focused on visual feedback/QA, no error auto-capture SDK, no AI generation      |
| **[BetterBugs](https://betterbugs.io)**       | Chrome extension + Web SDK for screenshot/screen recording with AI debugging assistant  | Free tier + paid  | Has SDK but focused on manual reporting, AI is for debugging not issue creation |
| **[Ybug.io](https://ybug.io)**                | Feedback widget with screenshots and technical context                                  | From $25/mo       | No SDK auto-capture, no AI, no handwritten note support                         |
| **[BugHerd](https://bugherd.com)**            | Point-and-click website feedback with Kanban board                                      | From $41/mo       | Agency-focused, no developer SDK, no AI, no error auto-capture                  |
| **[Sentry](https://sentry.io)**               | Full observability platform — error tracking, performance, session replay               | Free tier + paid  | Heavyweight, no AI issue creation, doesn't create GitHub issues automatically   |
| **[BugScribe](https://bug-scribe.github.io)** | AI-assisted bug report generation with validity detection                               | Research project  | Not a production tool, no SDK, no integrations                                  |
| **[GitHub Copilot](https://github.blog)**     | Screenshot → issue via Copilot chat                                                     | Part of Copilot   | Manual process, no auto-capture, no SDK, requires Copilot subscription          |

### Where Glitchgrab fits

Glitchgrab is **not** trying to be Sentry (full observability) or Marker.io (agency feedback workflows). It's a focused tool that solves one problem: **the gap between noticing a bug and having a well-written GitHub issue**.

The closest competitor is **BetterBugs** (SDK + AI), but Glitchgrab goes further with handwritten note support, full AI issue generation (not just AI debugging), GitHub-native output, MCP integration, and open-source availability.

## Tech Stack

| Layer           | Technology                            |
| --------------- | ------------------------------------- |
| Framework       | Next.js 15 (App Router)               |
| Database        | Neon (Serverless PostgreSQL)          |
| ORM             | Prisma                                |
| Auth            | NextAuth.js (GitHub OAuth)            |
| AI              | Claude API + OpenAI API (user choice) |
| Deployment      | Vercel                                |
| Monorepo        | Turborepo                             |
| Package Manager | bun                                   |

## Project Structure

```
glitchgrab/
├── apps/
│   └── web/                    # Next.js dashboard + API
├── packages/
│   ├── sdk-nextjs/             # glitchgrab
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

- [ ] GitHub OAuth + repo connection + token generation
- [ ] AI pipeline: image/text → structured GitHub issue
- [ ] SDK: Error boundary + auto-capture
- [ ] SDK: Report Error button
- [ ] Dashboard: Upload screenshot/notes
- [ ] AI deduplication check
- [ ] MCP server
- [ ] Linear + Jira support
- [ ] Multi-framework SDK (React, Vue)

## License

MIT

---

Built by [Naresh](https://github.com/webnaresh)
