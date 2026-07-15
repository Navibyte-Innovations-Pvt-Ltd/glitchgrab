# glitchgrab

Turn messy bugs into structured GitHub issues with AI. Drop-in SDK for Next.js apps.

## How do I install Glitchgrab?

```bash
npm install glitchgrab
# or
bun add glitchgrab
```

## How do I get started?

Wrap your app with `GlitchgrabProvider`:

```tsx
// app/layout.tsx
import { GlitchgrabProvider } from "glitchgrab";

export default function RootLayout({ children }) {
  return (
    <GlitchgrabProvider token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!}>
      {children}
    </GlitchgrabProvider>
  );
}
```

## How does user session tracking work?

Pass a `session` prop so bug reports include the reporter's identity. This lets you trace which user reported each bug.

```tsx
import { GlitchgrabProvider, type GlitchgrabSession } from "glitchgrab";
import { useSession } from "next-auth/react"; // or your auth library

function Providers({ children }) {
  const { data: authSession } = useSession();

  // Map your auth session to GlitchgrabSession
  const session: GlitchgrabSession | null = authSession?.user
    ? {
        userId: authSession.user.id,     // required - your DB primary key
        name: authSession.user.name,     // required - display name
        email: authSession.user.email,   // optional
        phone: authSession.user.phone,   // optional
      }
    : null;

  return (
    <GlitchgrabProvider
      token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!}
      session={session}
    >
      {children}
    </GlitchgrabProvider>
  );
}
```

### GlitchgrabSession type

```ts
interface GlitchgrabSession {
  userId: string;          // required - primary key from your database
  name: string;            // required - reporter's display name
  email?: string | null;   // optional
  phone?: string | null;   // optional
  [key: string]: unknown;  // any extra fields
}
```

The `userId` is stored with every report. Use it to look up which user reported a bug in your own database.

## How do I add a report button?

### Default floating button

```tsx
import { ReportButton } from "glitchgrab";

// Floating button at bottom-right (default)
<ReportButton position="bottom-right" label="Report Bug" />
```

### Custom trigger (headless)

Use the render prop to bring your own button UI:

```tsx
import { ReportButton } from "glitchgrab";

<ReportButton>
  {({ onClick, capturing }) => (
    <button onClick={onClick} disabled={capturing}>
      {capturing ? "Capturing..." : "Report a Bug"}
    </button>
  )}
</ReportButton>
```

The modal handles screenshot capture, preview, upload, retake, and submission. Your custom button just triggers it.

## How do I report bugs programmatically?

Use the `useGlitchgrab` hook to report bugs from code:

```tsx
import { useGlitchgrab } from "glitchgrab";

function MyComponent() {
  const { reportBug, report, addBreadcrumb, openReportDialog } = useGlitchgrab();

  // Report a bug silently (no UI)
  await reportBug("Button not working on mobile");

  // Report with a specific type
  await report("FEATURE_REQUEST", "Add dark mode support");

  // Open the Report Bug modal (captures screenshot + shows dialog)
  openReportDialog();

  // Open with pre-filled description
  openReportDialog({ description: "Error on /settings: Something went wrong" });

  // Add custom breadcrumbs for debugging context
  addBreadcrumb("User clicked checkout", { cartSize: "3" });
}
```

### Open report dialog on bad feedback

```tsx
function FeedbackWidget() {
  const { openReportDialog } = useGlitchgrab();

  return (
    <div>
      <button onClick={() => alert("Thanks!")}>Good</button>
      <button onClick={() => openReportDialog()}>Bad — report a bug</button>
    </div>
  );
}
```

Note: `openReportDialog()` requires a `<ReportButton>` to be mounted somewhere in the component tree. It triggers the same modal with screenshot capture.

## What keyboard shortcuts are available?

Once `GlitchgrabProvider` is mounted, these shortcuts work globally:

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+G` / `Ctrl+Shift+G` | Open the report dialog |
| `Cmd+V` / `Ctrl+V` (dialog open) | Paste a screenshot from clipboard |
| `Escape` | Close the dialog |

No configuration needed — shortcuts are active as long as the provider is in the tree.

### Showing the shortcut in your own UI

The report dialog shows the shortcut on its first step. To advertise it elsewhere — a support menu, a sidebar hint — read `shortcutLabel` instead of hardcoding the string. It resolves to `⌘⇧G` on Mac and `Ctrl+Shift+G` everywhere else, and stays in sync with the handler:

```tsx
function SupportHint() {
  const { shortcutLabel } = useGlitchgrab();
  return <p>Found a bug? Press {shortcutLabel} anywhere to report it.</p>;
}
```

It is SSR-safe: it renders `Ctrl+Shift+G` on the server and corrects to the platform label after mount.

## How do I fetch reports by user?

### React hook (recommended)

```tsx
import { useGlitchgrabReports } from "glitchgrab";

function MyReports() {
  const { reports, isLoading, error, refetch } = useGlitchgrabReports({
    token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
    userId: session.user.id,        // your DB primary key
    limit: 20,                       // optional, default 100
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {reports.map((r) => (
        <li key={r.id}>
          {r.issue?.title ?? r.rawInput} — {r.issue?.githubState ?? r.status}
        </li>
      ))}
    </ul>
  );
}
```

### With TanStack Query

```tsx
import { fetchGlitchgrabReports } from "glitchgrab";
import { useQuery } from "@tanstack/react-query";

const { data: reports, isLoading } = useQuery({
  queryKey: ["glitchgrab-reports", session.user.id],
  queryFn: () => fetchGlitchgrabReports({
    token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
    userId: session.user.id,
    limit: 50,
  }),
});
```

### REST API

Use the REST API directly to fetch reports:

```bash
# Fetch all reports
curl -H "Authorization: Bearer gg_your_token" \
  https://www.glitchgrab.dev/api/v1/sdk/reports

# Fetch reports by a specific user
curl -H "Authorization: Bearer gg_your_token" \
  "https://www.glitchgrab.dev/api/v1/sdk/reports?reporterPrimaryKey=user_123"

# Filter by status
curl -H "Authorization: Bearer gg_your_token" \
  "https://www.glitchgrab.dev/api/v1/sdk/reports?status=CREATED&limit=20"
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "cmn7abc123",
      "source": "SDK_USER_REPORT",
      "status": "CREATED",
      "rawInput": "Button not working",
      "reporterPrimaryKey": "user_123",
      "reporterName": "John Doe",
      "reporterEmail": "john@example.com",
      "reporterPhone": null,
      "pageUrl": "/dashboard/settings",
      "createdAt": "2026-03-26T12:00:00.000Z",
      "issue": {
        "githubNumber": 42,
        "githubUrl": "https://github.com/your/repo/issues/42",
        "title": "Button not working",
        "labels": ["bug"],
        "severity": "medium",
        "githubState": "open"
      }
    }
  ]
}
```

### Response fields

| Field | Description |
|-------|-------------|
| `id` | Report ID — use this for [managing issues](#how-do-i-approve-reject-or-close-issues) |
| `source` | `SDK_AUTO` (crash) or `SDK_USER_REPORT` (user clicked report) |
| `status` | `PENDING`, `PROCESSING`, `CREATED`, `FAILED` |
| `reporterPrimaryKey` | The `userId` you passed in the session prop |
| `reporterName` | Reporter's display name |
| `issue.githubState` | Live GitHub issue state: `open`, `closed`, or `null` if deleted |
| `issue.labels` | Labels on the GitHub issue (e.g., `["bug", "approved"]`) |
| `issue.severity` | AI-assigned severity |
```

## How do I approve, reject, or close issues?

### React hook

```tsx
import { useGlitchgrabActions } from "glitchgrab";

function ReportActions({ reportId }: { reportId: string }) {
  const { approve, reject, close, isPending, error } = useGlitchgrabActions({
    token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
    onSuccess: () => refetch(),        // refresh your reports list
    onError: (err) => alert(err.message),
  });

  return (
    <div>
      <button onClick={() => approve(reportId)} disabled={isPending}>Approve</button>
      <button onClick={() => reject(reportId)} disabled={isPending}>Reject</button>
      <button onClick={() => close(reportId)} disabled={isPending}>Close</button>
      {error && <p>{error}</p>}
    </div>
  );
}
```

### Dashboard

Go to **Reports > Product Issues**. Each open report shows:
- **Approve** — adds `approved` label to GitHub issue
- **Reject** — adds `rejected` label to GitHub issue
- **Close** — closes the GitHub issue

### REST API

`POST /api/v1/reports/{reportId}/actions`

Auth: `Bearer gg_` token or dashboard session.

#### Approve a report

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "label", "label": "approved"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Reject a report

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "label", "label": "rejected"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Close an issue

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "close"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Reopen an issue

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "reopen"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Remove a label

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "unlabel", "label": "rejected"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Add any custom label

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "label", "label": "high-priority"}' \
  https://www.glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

### How to get the report ID

Use the [Fetching Reports API](#how-do-i-fetch-reports-by-user) to list reports. Each report has an `id` field — use that as `REPORT_ID`.

### How it works

1. End-user reports a bug via SDK -> GitHub issue created
2. You fetch reports via API or view on dashboard
3. Approve/reject/close via API or dashboard buttons
4. Labels and state sync directly to GitHub — GitHub is the source of truth

## How do I add comments to a report?

Each report has a conversation thread powered by GitHub issue comments. No extra database — comments live on GitHub.

### View a report with comments

```bash
curl -H "Authorization: Bearer gg_your_token" \
  https://www.glitchgrab.dev/api/v1/sdk/reports/REPORT_ID
```

Returns the full issue body + all comments:

```json
{
  "success": true,
  "data": {
    "id": "cmn7abc123",
    "issue": {
      "title": "Button not working",
      "body": "## Description\n\nThe submit button...",
      "githubState": "open",
      "labels": ["bug"]
    },
    "comments": [
      {
        "author": "WebNaresh",
        "body": "Can you share your browser version?",
        "createdAt": "2026-03-27T10:00:00Z"
      },
      {
        "author": "WebNaresh",
        "body": "It's Chrome 120 on Windows\n\n---\n> Commented by: **Vivek** (vivek@example.com)",
        "createdAt": "2026-03-27T10:05:00Z"
      }
    ]
  }
}
```

### Reply to a report

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"message": "I can reproduce this, fixing now", "reporterName": "Vivek", "reporterEmail": "vivek@example.com"}' \
  https://www.glitchgrab.dev/api/v1/sdk/reports/REPORT_ID/comments
```

The comment is posted to the GitHub issue with attribution: "Commented by: **Vivek** (vivek@example.com)".

### Dashboard

Click any report on the Reports page to see the full conversation thread. Reply directly from the dashboard — comments sync to GitHub.

## How do I add an error boundary?

Wrap components to auto-capture React errors:

```tsx
import { GlitchgrabErrorBoundary } from "glitchgrab";

<GlitchgrabErrorBoundary fallback={<p>Something went wrong</p>}>
  <MyComponent />
</GlitchgrabErrorBoundary>
```

## What configuration options are available?

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | Your Glitchgrab API token (`gg_...`) |
| `session` | `GlitchgrabSession \| null` | `null` | Logged-in user info for report attribution |
| `baseUrl` | `string` | `https://www.glitchgrab.dev` | API base URL |
| `breadcrumbs` | `boolean` | `true` | Enable automatic breadcrumb tracking |
| `maxBreadcrumbs` | `number` | `50` | Max breadcrumbs to keep |
| `onError` | `(error: Error) => void` | - | Called on unhandled errors |
| `onReportSent` | `(result: ReportResult) => void` | - | Called after a report is sent |
| `fallback` | `ReactNode` | - | Error boundary fallback UI |
| `ignoreErrors` | `(string \| RegExp)[]` | - | Skip auto-capture for errors whose message matches (substring for `string`, `.test()` for `RegExp`) |

### Ignoring known-noisy errors

Some errors that reach `window.onerror` aren't app bugs — browser extension bridges (Grammarly, password managers, etc.) can throw errors that look like they come from your page. If you keep seeing the same non-actionable signature auto-filed as a report, suppress it:

```tsx
<GlitchgrabProvider
  token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!}
  ignoreErrors={[/Object Not Found Matching Id.*MethodName:update/]}
>
  {children}
</GlitchgrabProvider>
```

## Do I need a Content-Security-Policy allowance?

If your app sets a CSP header (e.g. via `proxy.ts` / `middleware.ts` in Next.js), allow Glitchgrab's API host so `fetch` calls from the SDK aren't blocked:

```ts
// proxy.ts / middleware.ts
response.headers.set(
  "Content-Security-Policy",
  "connect-src 'self' https://glitchgrab.dev; ..." // plus your existing directives
);
```

- `connect-src https://glitchgrab.dev` — required for `sendReport`, `enhanceText`, `transcribeAudio`, and the report-fetching hooks/REST calls. All SDK requests go to this single host by default.
- If you pass a custom `baseUrl` prop, allow that host instead (self-hosted or proxied deployments).
- Screenshot capture (`html2canvas-pro`) runs entirely client-side against `document.body` — no network request, no extra `img-src`/`connect-src` needed for it.
- No `script-src`, `style-src`, or `frame-src` allowances are required — the SDK doesn't load remote scripts, styles, or iframes.

## How does auto-capture work?

In production (`NODE_ENV=production`), the SDK automatically captures:
- Unhandled JavaScript errors
- Unhandled promise rejections
- Console errors (as breadcrumbs)
- Navigation events (as breadcrumbs)
- API calls (as breadcrumbs)

Auto-capture is **disabled in development** to avoid noisy issues.

## What data is included in each report?

- Description from the user
- Screenshot (auto-captured or uploaded)
- Page URL and user agent
- Device info (screen size, viewport, platform, language, color scheme)
- Page navigation history
- Activity log (last 15 breadcrumbs)
- Session info (userId, name, email, phone)

## License

MIT
