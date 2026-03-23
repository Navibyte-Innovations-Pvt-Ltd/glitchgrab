# glitchgrab

Drop-in error capture and bug reporting for Next.js apps. Production errors automatically become GitHub issues.

## Install

```bash
npm install glitchgrab
# or
bun add glitchgrab
```

## Quick Start

Wrap your app with `GlitchgrabProvider` — that's it:

```tsx
// app/layout.tsx
import { GlitchgrabProvider } from "glitchgrab";

export default function RootLayout({ children }) {
  return (
    <GlitchgrabProvider token="gg_your_token">
      {children}
    </GlitchgrabProvider>
  );
}
```

This gives you:
- Auto-capture of unhandled errors and promise rejections
- Error boundary around your entire app
- Page visit tracking for reproduction context
- URL sanitization (strips tokens, keys, passwords)

## Get a Token

1. Go to [glitchgrab.dev](https://glitchgrab.dev)
2. Sign in with GitHub
3. Connect a repo
4. Generate an API token

## Usage

### 1. Auto-Capture (zero config)

Just add the provider. Production errors are captured automatically with:
- Error message and stack trace
- Current URL (sanitized)
- User agent
- Visited pages history

### 2. Manual Bug Reporting (`useGlitchgrab` hook)

Build your own report button or trigger:

```tsx
"use client";
import { useGlitchgrab } from "glitchgrab";

function MyReportButton() {
  const { reportBug } = useGlitchgrab();

  return (
    <button onClick={() => reportBug("The checkout flow is broken")}>
      Report Bug
    </button>
  );
}
```

With metadata:

```tsx
reportBug("Payment failed", {
  userId: "123",
  plan: "pro",
  browser: "Chrome 120",
});
```

### 3. Pre-built Report Button (optional)

If you want a ready-made floating button:

```tsx
import { GlitchgrabProvider, ReportButton } from "glitchgrab";

<GlitchgrabProvider token="gg_your_token">
  {children}
  <ReportButton />
</GlitchgrabProvider>
```

Options:

```tsx
<ReportButton
  position="bottom-left"  // "bottom-right" (default) | "bottom-left"
  label="Report Issue"    // default: "Report Bug"
/>
```

### 4. Custom Error Boundary

Wrap specific sections with a custom fallback:

```tsx
import { GlitchgrabErrorBoundary } from "glitchgrab";

<GlitchgrabErrorBoundary
  token="gg_your_token"
  fallback={<div>Something went wrong in this section</div>}
>
  <DangerousComponent />
</GlitchgrabErrorBoundary>
```

### 5. Provider Options

```tsx
<GlitchgrabProvider
  token="gg_your_token"         // Required — your API token
  baseUrl="https://your-api.com" // Optional — custom API URL (default: glitchgrab.dev)
  onError={(error) => {          // Optional — callback when errors are captured
    console.log("Captured:", error.message);
  }}
  fallback={<ErrorPage />}       // Optional — what to show when the app crashes
>
  {children}
</GlitchgrabProvider>
```

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `GlitchgrabProvider` | Wraps your app. Captures errors, tracks pages. |
| `ReportButton` | Optional floating bug report button with modal. |
| `GlitchgrabErrorBoundary` | Standalone error boundary for specific sections. |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useGlitchgrab()` | `{ reportBug, token, baseUrl }` | Access bug reporting in any component. |

### Utilities

| Function | Description |
|----------|-------------|
| `sanitizeUrl(url)` | Strips sensitive query params from URLs. |
| `captureContext(pages)` | Returns current URL, user agent, timestamp. |
| `sendReport(payload, baseUrl)` | Low-level function to send a report. |

## Safety

- **Never crashes your app.** Every function is wrapped in try/catch.
- **Non-blocking.** Uses `fetch` with `keepalive` and `sendBeacon` fallback.
- **No sensitive data leaked.** URLs are sanitized before sending.
- **Zero external dependencies.** Only peer deps on React and Next.js.

## License

MIT
