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
- **AWS S3** for screenshot storage (not Vercel Blob).
- **Tailwind CSS v4** for styling.
- **TanStack Query + Axios** for client-side data fetching. `useQuery` for GET, `useMutation` for POST/PATCH/DELETE. Server-side code uses raw `fetch`.
- **Razorpay** for subscription billing (INR ₹199/mo).

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

### Input flows (implemented)
1. **SDK auto-capture** — unhandled errors in production → context + screenshot → AI pipeline → issue
2. **SDK report button** — end-user clicks report → screenshot + description → issue created directly (no AI)
3. **Dashboard chat** — developer describes bug or uploads screenshot → AI pipeline → issue

### Input flows (planned, not yet built)
4. **Handwritten notes** — photo upload → OCR → issue (issue #60)
5. **MCP server** — Claude Desktop integration

### SDK rules
- Must NEVER crash the host app. Everything in try/catch, fail silently.
- Non-blocking — screenshot capture and API calls use `keepalive: true`.
- Zero deps beyond React/Next.js peer deps + html2canvas-pro.
- Works with Next.js 13, 14, and 15.
- Sanitize URLs — strip sensitive query params (tokens, keys, etc).
- Auto-error capture is **disabled in development** (`NODE_ENV=development`).
- `ReportButton` is a headless wrapper — supports render prop for custom trigger UI.
- `session` prop on `GlitchgrabProvider` accepts `GlitchgrabSession` with `userId` (required), `name` (required), `email`, `phone`.
- SDK user reports (`SDK_USER_REPORT`) bypass AI and create GitHub issues directly.

## Database models (Prisma)

Key models: `User`, `Repo`, `ApiToken`, `Report`, `Issue`, `AiConfig`, `Subscription`, `Webhook`

- `Report` has enum `source`: SDK_AUTO, SDK_USER_REPORT, DASHBOARD_UPLOAD, HANDWRITTEN_NOTE, MCP, COLLABORATOR
- `Report` has enum `status`: PENDING, PROCESSING, CREATED, DUPLICATE, FAILED
- `Report` stores reporter info: `reporterPrimaryKey` (required), `reporterName` (required), `reporterEmail`, `reporterPhone`
- `AiConfig` stores per-user AI provider choice + encrypted API key (if BYOK)
- User AI keys encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var
- `Subscription` tracks Razorpay billing: plan, status, period dates

## API design

- All endpoints under `/api/v1/` — versioned from day one
- Response shape: `{ success: boolean, data?: T, error?: string }`
- Auth: Bearer token in Authorization header (for SDK calls) or session (for dashboard)
- Rate limit: 60 reports per token per hour (configurable)

### SDK API endpoints (token auth)
- `POST /api/v1/sdk/report` — submit a bug report (SDK_USER_REPORT bypasses AI, SDK_AUTO goes through AI pipeline)
- `GET /api/v1/sdk/reports` — fetch reports for a repo. Supports `?reporterPrimaryKey=xxx`, `?status=CREATED`, `?limit=20`
- `GET /api/v1/repos/github` — list user's GitHub repos for connect dialog

### Dashboard API endpoints (session auth)
- `POST /api/v1/reports` — submit report from dashboard chat (goes through AI pipeline)
- `GET /api/v1/repos` — list connected repos with token/report counts
- `POST /api/v1/billing/subscribe` — create Razorpay subscription
- `POST /api/v1/billing/verify` — verify Razorpay payment
- `POST /api/v1/billing/webhook` — Razorpay webhook handler
- `POST /api/v1/collaborators/invite` — invite collaborator
- `PATCH /api/v1/collaborators/:id/revoke` — revoke collaborator access

### Screenshots
- Screenshots uploaded to **AWS S3** (not committed to GitHub repos)
- S3 env vars: `NEXT_AWS_ACCESS_KEY_ID`, `NEXT_AWS_SECRET_ACCESS_KEY`, `NEXT_AWS_BUCKET_NAME`, `NEXT_AWS_S3_REGION`
- Optional CDN: `AWS_S3_CDN_DOMAIN`

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
- **WebView GPU fix**: Mobile app injects `webview` class on `<html>`. Global CSS disables `backdrop-filter`, `animation-duration`, and `transition-duration` for `.webview *` to prevent MediaTek GPU crashes.
- **Navigation in WebView**: Sheet menu uses `window.location.href` (full page nav) instead of `router.push` (client nav) in WebView to prevent GPU freeze during portal teardown. Detected via `document.documentElement.classList.contains("webview")`.

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
