# CLAUDE.md — Glitchgrab

## What is this project?

Glitchgrab is an open-source SaaS tool that converts messy bug inputs (handwritten notes, screenshots, production errors, user-reported bugs) into well-structured GitHub issues using AI (Claude or OpenAI). It has four components: an npm SDK for Next.js, a web dashboard, a mobile app (Android/iOS), and an MCP server.

## Monorepo structure

- **apps/web** — Next.js 15 (App Router) dashboard + API routes. Deployed on Vercel.
- **apps/mobile** — React Native (Expo SDK 55) mobile app. WebView wrapper around the web dashboard with native features (share intent, deep links, secure token storage). Builds APK via `bun run build:android:prod`.
- **packages/sdk-nextjs** — `glitchgrab` npm package. Drop-in error capture + report button for Next.js apps.
- **packages/mcp-server** — MCP server using `@modelcontextprotocol/sdk`. Connects to Claude Desktop.
- **packages/shared** — Shared TypeScript types and constants used across all packages.

## Tech decisions

- **Bun** for package management. Use `bun` everywhere, not npm/yarn.
- **Turborepo** for monorepo orchestration.
- **Next.js 15 App Router** — server components by default, `"use client"` only when needed. Use route handlers (`route.ts`), not old API routes.
- **Neon** (serverless PostgreSQL) via **Prisma** ORM.
- **NextAuth.js** with GitHub OAuth for auth.
- **Vercel Blob** for screenshot storage.
- **Tailwind CSS v4** for styling.

## Core concepts

### Token model
- No "project" concept. One token = one GitHub repo. Dead simple.
- Token format: `gg_` prefix + 32 alphanumeric chars.
- Tokens stored as SHA-256 hash in DB, never plaintext.
- User connects GitHub → selects repo → gets token.

### AI pipeline
All 4 input flows converge into one pipeline:
1. Normalize input (image/text/error → standard format)
2. Enrich with repo context (existing issues, labels)
3. Dedup check against open issues
4. Generate issue (title, body, labels, severity)
5. Push to GitHub via API + attach screenshot

AI provider is abstracted — both Claude and OpenAI implement the same interface. Users can BYOK (bring own key) or use platform-provided keys.

### 4 input flows
1. **Handwritten notes** — photo upload on dashboard → AI reads handwriting → issue
2. **SDK auto-capture** — unhandled errors in production → context + screenshot → issue
3. **Report button** — end-user clicks "Report Error" → context captured → issue
4. **Dashboard upload** — developer uploads screenshot with note → issue

### SDK rules
- Must NEVER crash the host app. Everything in try/catch, fail silently.
- Non-blocking — screenshot capture and API calls use `keepalive: true`.
- Zero deps beyond React/Next.js peer deps + html2canvas.
- Works with Next.js 13, 14, and 15.
- Sanitize URLs — strip sensitive query params (tokens, keys, etc).

## Database models (Prisma)

Key models: `User`, `Repo`, `ApiToken`, `Report`, `Issue`, `AiConfig`

- `Report` has enum `source`: SDK_AUTO, SDK_USER_REPORT, DASHBOARD_UPLOAD, HANDWRITTEN_NOTE, MCP
- `Report` has enum `status`: PENDING, PROCESSING, CREATED, DUPLICATE, FAILED
- `AiConfig` stores per-user AI provider choice + encrypted API key (if BYOK)
- User AI keys encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var

## API design

- All endpoints under `/api/v1/` — versioned from day one
- Response shape: `{ success: boolean, data?: T, error?: string }`
- Auth: Bearer token in Authorization header (for SDK calls) or session (for dashboard)
- Rate limit: 60 reports per token per hour (configurable)
- Validate all inputs with Zod

## Commands

```bash
bun install              # Install all deps
bun run dev              # Start all apps in dev mode
bun run build            # Build everything
bun run test             # Run all tests
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema to database
```

### Mobile app commands (from `apps/mobile`)
```bash
bun run build:android:prod     # Release APK (production)
bun run build:android:dev      # Debug APK (development)
bun run install:android:prod   # Build + install release APK via adb
bun run install:android:dev    # Build + install debug APK via adb
```

## Mobile app architecture

- **WebView-based** — the mobile app wraps the web dashboard in a `react-native-webview`. All UI lives in `apps/web`; the native shell handles auth, deep links, and share intent.
- **Auth flow**: GitHub OAuth via `expo-auth-session` → exchange code at `/api/auth/mobile` → session token stored in `expo-secure-store` → WebView loads `/api/auth/mobile/session?token=...` which sets a cookie and redirects to `/dashboard`.
- **Share intent**: Users share screenshots from other apps → Expo reads image as base64 → injects into WebView as a paste event on the chat textarea.
- **Deep links**: `glitchgrab://` scheme and `https://glitchgrab.dev/collaborate` for collaborator invitations.
- **Collaborator mode**: Separate flow where the WebView loads a collab accept URL instead of the main dashboard.
- **Key deps**: Expo 55, React Native 0.83, react-native-webview, expo-share-intent, expo-secure-store.
- **Performance**: Avoid injecting JS that runs on every scroll/resize frame. Use `requestAnimationFrame` for layout recalculations. Remove `console.*` calls in production builds.

## Code conventions

- TypeScript strict mode everywhere
- Named exports, barrel exports (index.ts) per package
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Server components by default in Next.js
- Database queries through `lib/db/` — never import Prisma directly in routes
- Custom error classes in `packages/shared/src/errors.ts`
- AI API calls: 3 retries with exponential backoff

## Critical gotchas

1. Never store API tokens in plaintext — SHA-256 hash before DB insert
2. Never store user AI keys in plaintext — AES-256-GCM encrypt
3. Screenshot capture is async — don't block error handling
4. Dedup is critical — production error spikes can create 100s of identical reports
5. SDK must never throw — wrap everything, fail silently
6. GitHub API rate limits — use installation token, not user token
7. MCP server calls the same REST API as the dashboard
