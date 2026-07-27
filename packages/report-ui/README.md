# @glitchgrab/report-ui

Internal, unpublished workspace package. Holds the actual "report a bug" UI —
the 2-step wizard (description, screenshot, annotation, voice dictation, AI
enhance, severity) — shared between **`glitchgrab`** (the published Next.js
SDK, `packages/sdk-nextjs`) and the **Chrome extension** (`packages/extension`).

## Why this package exists

Before this package existed, the report dialog lived only inside
`packages/sdk-nextjs`. When the Chrome extension needed the exact same "Report
Bug" UI (#297 — testers reporting bugs from any tab, not just inside an
instrumented Next.js app), the choice was: duplicate ~2,500 lines of React and
let the two copies drift, or extract a shared package. This is the shared
package.

Any future UI change to the report dialog — new field, new step, visual
tweak — happens **once**, here, and both consumers pick it up on their next
build.

## What's in it

- `report-dialog.tsx` (~2,200 lines) — the actual dialog: 2-step wizard, drag/paste
  image upload, canvas annotation, voice dictation (Web Speech API +
  MediaRecorder), AI "enhance" text polish, host dark/light theme + accent-color
  auto-detection, retry/`sendBeacon` fallback on submit.
- `annotation-canvas.tsx` — the `<canvas>`-based pen/arrow/rect annotator used
  when marking up a screenshot.
- `shortcut.ts` — the `Cmd/Ctrl+Shift+G` shortcut label helper.
- `types.ts` — the minimal type surface (`ReportType`, `ReportSeverity`,
  `ReportResult`, `ReportFn`, `EnhanceTextFn`) the dialog actually needs. Kept
  separate from the SDK's own `types.ts`, which also covers auto-capture/
  breadcrumbs — irrelevant here.

## How each consumer plugs in

`ReportDialog` takes its actual behavior as props — it doesn't know or care
who's hosting it:

```tsx
<ReportDialog
  report={report}                 // (type, description, metadata?) => Promise<ReportResult | null>
  enhanceText={enhance}            // optional — AI text polish
  transcribeAudio={transcribe}     // optional — voice dictation
  types={types}
  showSeverity={showSeverity}
  captureScreenshot={capture}      // optional — defaults to html2canvas-pro over document.body
/>
```

- **SDK** (`packages/sdk-nextjs/src/provider.tsx`): renders it inside
  `GlitchgrabProvider`, wires `report`/`enhanceText`/`transcribeAudio` to its
  own `sendReport`/`enhanceText`/`transcribeAudio` fetch helpers, leaves
  `captureScreenshot` on the default (html2canvas over the host page's
  `document.body` — correct, since the dialog IS embedded in that page).
- **Extension** (`packages/extension/src/report/report.tsx`): a small React
  root in a persistent extension window (not the popup — MV3 popups unload on
  blur, which would kill an in-progress voice recording). Overrides
  `captureScreenshot` with `chrome.tabs.captureVisibleTab` (the extension's
  own tiny window is not the tab being reported — `document.body` there would
  screenshot the wrong thing), and wires `report` to
  `POST /api/v1/extension/report` using the tester's `ExtensionSession`
  identity instead of a `gg_` token.

## Build

```bash
bun run build   # tsup — cjs + esm + .d.ts
```

`react`/`react-dom` are `peerDependencies` (external in the tsup build) — the
SDK's own build (`packages/sdk-nextjs/tsup.config.ts`) explicitly
`noExternal`s `@glitchgrab/report-ui` so this package's code ends up bundled
INTO the published `glitchgrab` npm package (this package itself is private
and never published — a real npm consumer can't resolve it as a separate
dependency). The extension's `build.ts` bundles it too, with an explicit
esbuild `alias` pinning `react`/`react-dom` to the monorepo root's copy —
without that, two separate React instances end up in one bundle (this
package's own `node_modules/react` vs. the extension's), which breaks hooks
with `Cannot read properties of null (reading 'useState')`.

## Tests

```bash
bun run test   # vitest + jsdom + @testing-library/react
```
