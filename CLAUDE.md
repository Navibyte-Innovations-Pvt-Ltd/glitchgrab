# CLAUDE.md — Glitchgrab

## What is this project?

Glitchgrab is an open-source SaaS tool that converts messy bug inputs (handwritten notes, screenshots, production errors, user-reported bugs) into well-structured GitHub issues using AI (Claude or OpenAI). Components: an npm SDK for Next.js, a web dashboard, a mobile app (Android/iOS), an MCP server, a **Chrome extension** + **GlitchRecord desktop app** that together turn a screen recording into a narrated tutorial and auto-create a GitHub issue from the captured interactions.

**Production URL**: `https://glitchgrab.dev` — use this as the base URL for all external links (WhatsApp templates, deep links, etc.). Example: `https://glitchgrab.dev/org/{slug}?triageAssign=assigned`.

## Monorepo structure

- **apps/web** — Next.js 15 (App Router) dashboard + API routes. Deployed on Vercel.
- **apps/mobile** — React Native (Expo SDK 55) mobile app. WebView wrapper around the web dashboard with native features (share intent, deep links, secure token storage). Builds APK via `bun run build:android:prod`.
- **apps/glitchrecord** — Electron screen recorder/editor (a fork of Recordly). Records the screen, edits clips/zooms, and hosts the GlitchGrab bridge that pairs with the Chrome extension. Dev via `bun run dev` (vite-plugin-electron hot-reloads main+preload). userData in dev: `~/Library/Application Support/GlitchRecord-dev`. **Testing: see `apps/glitchrecord/CLAUDE.md`** — three lanes (deterministic unit, real-browser capture e2e, Electron UI click e2e) + the bug→test→scenario workflow.
- **packages/extension** — `@glitchgrab/extension`. The **Chrome extension** (MV3) that captures browser interaction events (click/input/scroll/navigate/select/keydown/copy/paste) during a recording. Build: `bun run build` → `dist/` (load unpacked). NOT published to the store yet.
- **packages/recordly-extension** — `@glitchgrab/recordly-extension`. A **Recordly in-app plugin** (permissions: timeline/ui/cursor) — the AI script generator panel inside GlitchRecord. NOT a Chrome extension; don't confuse with `packages/extension`.
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
  - **Never** use `useState` + `useEffect` to fetch data. Always `useQuery`. `useEffect` is only valid for: timers, DOM events, non-fetch side effects.
  - After mutations: always `queryClient.invalidateQueries`. Never manually update state with `setData`.
- **Razorpay** for subscription billing (INR ₹199/mo).

## Core concepts

### Token model
- No "project" concept. One token = one GitHub repo. Dead simple.
- Token format: `gg_` prefix + 32 alphanumeric chars.
- Tokens stored as SHA-256 hash in DB, never plaintext.
- User connects GitHub → selects repo → gets token.

### Issue creation pipeline (NO AI enrichment)
All flows create GitHub issues DIRECTLY from user-provided text + metadata. There is **no AI pipeline**:
1. Receive report (description, screenshots, error data)
2. For SDK_AUTO only: signature-based dedup (errorMessage + pageUrl hash — deterministic, NOT AI)
3. Build issue body deterministically from inputs
4. Upload screenshots to S3, append markdown refs
5. Push to GitHub via API

There is NO AI dedup, NO AI label generation, NO AI severity inference, NO AI repo-context enrichment. The pipeline is synchronous.

### AI enhance (opt-in, the only AI feature)
`POST /api/v1/ai/enhance-text` polishes user-written description text — grammar/clarity only, never invents details. Token auth (Bearer `gg_…`) OR dashboard session required; anonymous = 401. Rate limit: 20 req/hr per token or session. Dashboard chat shows a sparkle button next to send. SDK exposes `useGlitchgrab().enhanceText(text)` and an "AI enhance" link in the report dialog.

### Input flows (implemented)
1. **SDK auto-capture** — unhandled errors in production → direct GitHub issue with error/stack/breadcrumbs (no AI)
2. **SDK report button** — end-user clicks report → screenshot + description → direct issue
3. **Dashboard chat** — developer describes bug or uploads screenshot → direct issue (sparkle button optionally polishes text before send)

### Input flows (planned, not yet built)
4. **MCP server** — Claude Desktop integration

### SDK rules
- Must NEVER crash the host app. Everything in try/catch, fail silently.
- Non-blocking — screenshot capture and API calls use `keepalive: true`.
- Zero deps beyond React/Next.js peer deps + html2canvas-pro.
- Works with Next.js 13, 14, and 15.
- Sanitize URLs — strip sensitive query params (tokens, keys, etc).
- Auto-error capture is **disabled in development** (`NODE_ENV=development`).
- `ReportButton` is a headless wrapper — supports render prop for custom trigger UI.
- `session` prop on `GlitchgrabProvider` accepts `GlitchgrabSession` with `userId` (required), `name` (required), `email`, `phone`.
- All SDK reports (SDK_USER_REPORT + SDK_AUTO) create GitHub issues directly. The SDK never triggers AI generation; the only AI surface is the optional `enhanceText` helper.

## Database models (Prisma)

Key models: `User`, `Repo`, `ApiToken`, `Report`, `Issue`, `AiConfig`, `Subscription`, `Webhook`

- `Report` has enum `source`: SDK_AUTO, SDK_USER_REPORT, DASHBOARD_UPLOAD, HANDWRITTEN_NOTE, MCP, COLLABORATOR
- `Report` has enum `status`: PENDING, PROCESSING (legacy — unused; kept for migration safety), CREATED, DUPLICATE, FAILED
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
- `POST /api/v1/sdk/report` — submit a bug report; creates a GitHub issue directly (no AI). SDK_AUTO uses signature-based dedup.
- `POST /api/v1/ai/enhance-text` — polish user description text (grammar/clarity only). Accepts Bearer `gg_…` token OR dashboard session. Rate limit: 20/hr.
- `GET /api/v1/sdk/reports` — fetch reports for a repo. Supports `?reporterPrimaryKey=xxx`, `?status=CREATED`, `?limit=20`
- `GET /api/v1/repos/github` — list user's GitHub repos for connect dialog

### Dashboard API endpoints (session auth)
- `POST /api/v1/reports` — submit report from dashboard chat; creates a GitHub issue directly (no AI)
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

### Chrome extension (from `packages/extension`)
```bash
bun run build                  # Build to dist/ (then Load unpacked in chrome://extensions)
bun run dev                    # build.ts --watch (rebuild on save)
```
After build: reload via the **↻** button on the existing entry (NOT "Load unpacked" again — that creates duplicate entries). Reload affected web tabs to replace orphaned content scripts.

### GlitchRecord (from `apps/glitchrecord`)
```bash
bun run dev                    # vite + electron (hot-reloads main/preload). User manages this — don't start/stop it.
```
Electron main/preload changes need a full quit + relaunch to take effect reliably.

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

## GlitchRecord ↔ extension capture pipeline

Turns a screen recording into a narrated tutorial + auto-created GitHub issue. The Chrome extension captures *what the user did on the page*; GlitchRecord records the *screen* and owns the session, AI script, and issue creation.

### Components
- **`packages/extension`** — MV3. `content.ts` (per-page event capture), `background.ts` (service worker: session state, WS client, tab orchestration), `popup/` (status UI).
- **`apps/glitchrecord/electron/glitchbridge/`** — `server.ts` (WS server on **port 7337**), `api.ts` (calls the web API), `types.ts` (shared `WsMsg`/`Session`/`CaptureEvent`).
- **`apps/glitchrecord/.../video-editor/GlitchgrabLogPanel.tsx`** — editor panel (list icon in the rail) showing captured events + a Copy button. **`launch/GlitchgrabEventFeed.tsx`** — live feed in the recorder HUD during recording.

### Flow
1. User presses Record in GlitchRecord → IPC `glitchbridge:recording-start` → `broadcastRecordingStart` creates an in-memory session, sets `recordingActive`, sends `recording:start` over WS.
2. Background `startCapture()` → sends `CAPTURE_START` to all tabs; content scripts attach DOM listeners.
3. Each event → background `CAPTURE_EVENT` → streamed live as `event:live` (HUD feed) + buffered in `state.events`.
4. Stop (ANY way) → `set-recording-state(false)` hook in `main.ts` broadcasts `recording:stop` (universal, not just the HUD button) → background `stopCapture()` → `events:upload` over WS.
5. Bridge persists events to disk, fires `eventsReadyCb` (→ editor `glitchbridge:events-ready` → panel refresh). If logged in: `uploadSession` → `generateScript` (Claude) → `createIssue` in the selected repo.

### Event model
`CaptureEvent`: `type` (click|input|select|keydown|scroll|copy|paste|navigate|idle), `t` (ms from start), `label`, `tag`, `url`, `preview` (typed text; passwords skipped), `meta` (rich element descriptor: role, icon, href, section, selector, classes, inputType…). Built by `describeElement()`/`getClickLabel()` in `content.ts`.

### Auth model
Capturing works WITHOUT login. Login + a selected repo are only needed for DB upload + AI script + GitHub issue. `broadcastRecordingStart` no longer gates on auth.

### Debugging
- **Unified debug log**: `~/Library/Application Support/GlitchRecord-dev/glitchgrab-debug.log` (dev). Extension logs forward over WS (`{type:"log"}`); GlitchRecord appends `appendDebugLog("rec", …)`. One file, both sides — read it directly.
- Extension `log()` also mirrors to every page console as `[GG-bg]` (read via any open tab).

### Gotchas (learned the hard way)
1. **Pages that LOAD during a recording** (new tab OR full-page navigation) get a fresh content script that missed the one-time `CAPTURE_START`. Fixed via: content script queries `GET_STATE` on bootstrap + background re-sends `CAPTURE_START` on `tabs.onUpdated` "complete". Without this → 0 events captured.
2. **"Extension context invalidated"** — orphaned content scripts from a previous extension version keep running in open tabs after reload; they die only on page reload. Current build has no periodic chrome calls, so its orphans are silent. Restart Chrome to clear old ones.
3. **Single instance** — GlitchRecord enforces `requestSingleInstanceLock()` always (the bridge owns port 7337; two instances can't coexist). A 2nd launch focuses the existing window.
4. **Idempotency** — `recording:stop` fires from two places (HUD button + `set-recording-state` hook). The bridge sets `session.finalized` so upload/script/issue run once → no duplicate issues. `buildIssueBody` guards meta by *shape* (empty `{}` is truthy but has no `cutRanges`).
5. **get-events** returns the *current* run's session even if empty — never falls back to the old persisted session while a session exists (would show stale events from a prior recording).
6. **Clipboard** in the editor uses Electron `clipboard.writeText` via IPC (`navigator.clipboard` silently fails in the renderer).
7. Content script only sees **page DOM** — Chrome address bar, `chrome://` pages, other native apps (WhatsApp, etc.) are NOT capturable.

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
8. Extension content script must never throw on a dead context — guard every `chrome.*` call with `isContextAlive()` + try/catch; no periodic chrome calls (the 600ms signal poll lives in the background SW, not content)
9. Capture chain breaks silently — when touching it, check the unified debug log (`glitchgrab-debug.log`) and confirm a page loading mid-recording still captures (see GlitchRecord ↔ extension pipeline gotchas)
