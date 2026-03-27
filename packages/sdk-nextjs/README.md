# glitchgrab

Turn messy bugs into structured GitHub issues with AI. Drop-in SDK for Next.js apps.

## Install

```bash
npm install glitchgrab
# or
bun add glitchgrab
```

## Quick Start

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

## Session (User Tracking)

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

## Report Button

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

## Programmatic Reporting

Use the `useGlitchgrab` hook to report bugs from code:

```tsx
import { useGlitchgrab } from "glitchgrab";

function MyComponent() {
  const { reportBug, report, addBreadcrumb } = useGlitchgrab();

  // Report a bug
  await reportBug("Button not working on mobile");

  // Report with a specific type
  await report("FEATURE_REQUEST", "Add dark mode support");

  // Add custom breadcrumbs for debugging context
  addBreadcrumb("User clicked checkout", { cartSize: "3" });
}
```

## Fetching Reports by User

Use the REST API to fetch reports for a specific user by their primary key:

```bash
# Fetch all reports
curl -H "Authorization: Bearer gg_your_token" \
  https://glitchgrab.dev/api/v1/sdk/reports

# Fetch reports by a specific user
curl -H "Authorization: Bearer gg_your_token" \
  "https://glitchgrab.dev/api/v1/sdk/reports?reporterPrimaryKey=user_123"

# Filter by status
curl -H "Authorization: Bearer gg_your_token" \
  "https://glitchgrab.dev/api/v1/sdk/reports?status=CREATED&limit=20"
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
| `id` | Report ID — use this for [managing issues](#managing-issues-approve--reject--close) |
| `source` | `SDK_AUTO` (crash) or `SDK_USER_REPORT` (user clicked report) |
| `status` | `PENDING`, `PROCESSING`, `CREATED`, `FAILED` |
| `reporterPrimaryKey` | The `userId` you passed in the session prop |
| `reporterName` | Reporter's display name |
| `issue.githubState` | Live GitHub issue state: `open`, `closed`, or `null` if deleted |
| `issue.labels` | Labels on the GitHub issue (e.g., `["bug", "approved"]`) |
| `issue.severity` | AI-assigned severity |
```

## Managing Issues (Approve / Reject / Close)

Once a report creates a GitHub issue, you can manage it from the dashboard or via API.

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
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Reject a report

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "label", "label": "rejected"}' \
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Close an issue

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "close"}' \
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Reopen an issue

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "reopen"}' \
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Remove a label

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "unlabel", "label": "rejected"}' \
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

#### Add any custom label

```bash
curl -X POST \
  -H "Authorization: Bearer gg_your_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "label", "label": "high-priority"}' \
  https://glitchgrab.dev/api/v1/reports/REPORT_ID/actions
```

### How to get the report ID

Use the [Fetching Reports API](#fetching-reports-by-user) to list reports. Each report has an `id` field — use that as `REPORT_ID`.

### How it works

1. End-user reports a bug via SDK -> GitHub issue created
2. You fetch reports via API or view on dashboard
3. Approve/reject/close via API or dashboard buttons
4. Labels and state sync directly to GitHub — GitHub is the source of truth

## Error Boundary

Wrap components to auto-capture React errors:

```tsx
import { GlitchgrabErrorBoundary } from "glitchgrab";

<GlitchgrabErrorBoundary fallback={<p>Something went wrong</p>}>
  <MyComponent />
</GlitchgrabErrorBoundary>
```

## Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | Your Glitchgrab API token (`gg_...`) |
| `session` | `GlitchgrabSession \| null` | `null` | Logged-in user info for report attribution |
| `baseUrl` | `string` | `https://glitchgrab.dev` | API base URL |
| `breadcrumbs` | `boolean` | `true` | Enable automatic breadcrumb tracking |
| `maxBreadcrumbs` | `number` | `50` | Max breadcrumbs to keep |
| `onError` | `(error: Error) => void` | - | Called on unhandled errors |
| `onReportSent` | `(result: ReportResult) => void` | - | Called after a report is sent |
| `fallback` | `ReactNode` | - | Error boundary fallback UI |

## Auto-Capture

In production (`NODE_ENV=production`), the SDK automatically captures:
- Unhandled JavaScript errors
- Unhandled promise rejections
- Console errors (as breadcrumbs)
- Navigation events (as breadcrumbs)
- API calls (as breadcrumbs)

Auto-capture is **disabled in development** to avoid noisy issues.

## What gets included in each report

- Description from the user
- Screenshot (auto-captured or uploaded)
- Page URL and user agent
- Device info (screen size, viewport, platform, language, color scheme)
- Page navigation history
- Activity log (last 15 breadcrumbs)
- Session info (userId, name, email, phone)

## License

MIT
