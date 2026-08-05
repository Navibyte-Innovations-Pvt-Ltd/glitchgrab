# @glitchgrab/extension

Chrome MV3 extension (`Glitchgrab`). **Not published to the Chrome Web Store
yet** — load unpacked from `dist/`. Two jobs:

1. **Capture pipeline** — captures browser interaction events (click, input,
   navigate, scroll, select, keydown, copy, paste) while a screen recording is
   in progress in the **GlitchRecord** desktop app (`apps/glitchrecord`), so
   the recording can be turned into a narrated tutorial + auto-created GitHub
   issue. See the repo-root `CLAUDE.md` for the full capture pipeline,
   event model, and gotchas.
2. **Tester identity + "Report Bug"** (#297) — lets a QA tester or the
   dashboard owner log in silently (no token paste) and file a bug directly
   from the browser, with work-time tracked for the audit log.

## Structure

```
src/
  background.ts     service worker — capture state, WS client to GlitchRecord,
                     tester auth/session, screenshot capture + report window
  content.ts        per-page: DOM event capture, auto-login postMessage handshake
  popup/            toolbar popup — capture status, tester status, Report Bug button
  report/           persistent window hosting the shared @glitchgrab/report-ui dialog
manifest.json
build.ts            esbuild — bundles all 4 entry points
```

## Build

```bash
bun run build                  # → dist/ (then "Load unpacked" in chrome://extensions)
bun run dev                     # build.ts --watch (rebuild on save)
```

After a build: reload via the **↻** button on the existing `chrome://extensions`
entry (not "Load unpacked" again — that creates a duplicate). Reload any open
web tabs to replace their now-orphaned content scripts.

### Why `build.ts` looks the way it does

- `jsx: "automatic"` + `define: {"process.env.NODE_ENV": '"production"'}` —
  the `report/report.tsx` entry point uses React. Without the `NODE_ENV`
  define, esbuild bundles React's **development** build, which uses
  `new Function()` for component stack traces — blocked by MV3's default CSP
  (`unsafe-eval` not allowed), so the report window renders **completely
  blank** with no visible error unless devtools happens to be open.
- `alias: { react: ..., "react-dom": ... }` pinned to the monorepo root's
  copies — `@glitchgrab/report-ui` is built with react/react-dom external, so
  without this alias esbuild resolves its internal `import "react"` from
  `packages/report-ui/node_modules/react` (a separate physical copy from the
  one the extension's own code resolves), landing two live React instances in
  one bundle — hooks then fail with
  `Cannot read properties of null (reading 'useState')`.

## Tester login + "Report Bug" (#297)

Two ways a tester/owner gets logged in, both silent (no token paste):

1. **QA magic-link** (`/qa/[token]` on the dashboard) — the page hands off a
   tokenless session via a `postMessage` handshake the content script picks
   up, gated to the `glitchgrab.dev`/`localhost:3000` origins only.
2. **Dashboard session** — any authenticated page fires the same handshake
   (see `apps/web/components/extension-auto-login.tsx`), so the org
   owner/admin gets logged in too, not just QA testers.

Clicking **Report Bug** in the popup:
1. Captures the active tab via `chrome.tabs.captureVisibleTab`.
2. Opens a persistent `chrome.windows.create` window (not the popup — MV3
   popups unload on blur, which would kill an in-progress voice recording)
   hosting the shared `@glitchgrab/report-ui` dialog.
3. The repo picker is scoped server-side: a QA tester sees only repos they're
   assigned (`TesterRepo`); a dashboard owner sees every repo they own. The
   picked `repoId` is re-verified server-side on submit — never trust the
   client (an earlier version of this had a real IDOR here).

Work-time tracking: an `ExtensionSession` row starts on login, heartbeats every
60s, and its `repoId` gets backfilled with whatever repo GlitchRecord actually
records against once a recording starts (unknown at login time — a dashboard
owner may have dozens of repos).

## Debugging

- Unified debug log:
  `~/Library/Application Support/GlitchRecord-dev/glitchgrab-debug.log` (dev).
  Extension logs forward over the WS connection; also mirrored to every page
  console as `[GG-bg]`.
- "Extension context invalidated" — orphaned content scripts from a previous
  build keep running in already-open tabs until that tab reloads.
