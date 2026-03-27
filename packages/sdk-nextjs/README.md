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
        "title": "Button not working"
      }
    }
  ]
}
```

## Managing Issues (Approve / Reject / Close)

Once a report creates a GitHub issue, repo owners can manage it from the Glitchgrab dashboard.

### Dashboard actions

Each open report card shows three buttons:

| Button | What it does |
|--------|-------------|
| **Approve** | Adds `approved` label to the GitHub issue |
| **Reject** | Adds `rejected` label to the GitHub issue |
| **Close** | Closes the GitHub issue |

### REST API

You can also manage issues programmatically:

```bash
# Close an issue
POST /api/v1/reports/{reportId}/actions
Body: {"action": "close"}

# Reopen an issue
POST /api/v1/reports/{reportId}/actions
Body: {"action": "reopen"}

# Add a label (approved, rejected, or any custom label)
POST /api/v1/reports/{reportId}/actions
Body: {"action": "label", "label": "approved"}

# Remove a label
POST /api/v1/reports/{reportId}/actions
Body: {"action": "unlabel", "label": "rejected"}
```

Requires session authentication (logged-in dashboard user who owns the repo).

### Workflow

1. End-user reports a bug via SDK -> GitHub issue created automatically
2. Repo owner reviews on Glitchgrab dashboard (Reports > Product Issues)
3. Owner clicks **Approve** -> `approved` label added to GitHub issue
4. Or clicks **Reject** -> `rejected` label added
5. Or clicks **Close** -> GitHub issue closed
6. All state lives on GitHub — no extra database status. GitHub is the source of truth.

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
