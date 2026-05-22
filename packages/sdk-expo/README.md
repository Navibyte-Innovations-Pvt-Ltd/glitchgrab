# @glitchgrab/sdk-expo

Bug capture SDK for Expo apps. Turns user bug reports into structured GitHub issues — with auto screenshot capture, 3-finger tap trigger, and native screenshot detection.

## Install

```bash
bun add @glitchgrab/sdk-expo

# Required peer deps
bun add react-native-view-shot expo-media-library expo-file-system
```

## Setup

Wrap your root layout with `GlitchgrabProvider`:

```tsx
// app/_layout.tsx (or App.tsx)
import { GlitchgrabProvider } from "@glitchgrab/sdk-expo";

export default function RootLayout({ children }) {
  return (
    <GlitchgrabProvider
      token="gg_your_token_here"
      user={{ id: currentUser.id, name: currentUser.name, email: currentUser.email }}
    >
      {children}
    </GlitchgrabProvider>
  );
}
```

That's it. 3-finger tap and screenshot detection work automatically from here.

## How gestures work

| Trigger | What happens |
|---------|-------------|
| **3-finger tap** | Captures current screen → opens report sheet |
| **Native screenshot** (power + vol) | Detects screenshot saved → opens report sheet with that image |

Both are enabled by default. Disable either:

```tsx
<GlitchgrabProvider
  token="gg_..."
  threeFinger={false}          // disable 3-finger tap
  screenshotDetection={false}  // disable screenshot detection
>
```

## Trigger report programmatically

```tsx
import { useGlitchgrab } from "@glitchgrab/sdk-expo";

function MyScreen() {
  const { reportBug, reportWithScreenshot } = useGlitchgrab();

  return (
    <>
      {/* Open sheet without screenshot */}
      <Button onPress={() => reportBug()} title="Report Bug" />

      {/* Capture screen then open sheet */}
      <Button onPress={() => void reportWithScreenshot()} title="Report with Screenshot" />

      {/* Open sheet with a URI you already have */}
      <Button onPress={() => reportBug({ screenshotUri: "/path/to/image.jpg" })} title="Report" />
    </>
  );
}
```

## User context

Pass `user` so reports include reporter identity. Maps to `reporterPrimaryKey` + `reporterName` on the report.

```tsx
<GlitchgrabProvider
  token="gg_..."
  user={{
    id: "user_123",          // required — your DB primary key
    name: "Naresh Bhosale",  // required — display name
    email: "naresh@example.com", // optional
  }}
>
```

If `user` is omitted, reports are filed as `anonymous`.

## app.json permissions

Add the `expo-media-library` plugin so screenshot detection works on Android and iOS:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-media-library",
        {
          "photosPermission": "Allow access to detect screenshots for bug reporting.",
          "isAccessMediaLocationEnabled": true
        }
      ]
    ]
  }
}
```

## Configuration reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | Glitchgrab repo token (`gg_...`) |
| `user` | `{ id, name, email? } \| null` | `undefined` | Reporter identity |
| `baseUrl` | `string` | `https://glitchgrab.dev` | API base URL |
| `threeFinger` | `boolean` | `true` | Enable 3-finger tap gesture |
| `screenshotDetection` | `boolean` | `true` | Detect native screenshots |

## What gets sent

Each report POSTs to `/api/v1/sdk/report`:

- Description (user-written)
- Report type: Bug / Feature / Question / Other
- Screenshot as base64 (if captured)
- Reporter identity (`id`, `name`, `email`)
- Source: `SDK_USER_REPORT`

A GitHub issue is created immediately. No AI pipeline — deterministic, fast.

## Get your token

1. Sign in at [glitchgrab.dev](https://glitchgrab.dev)
2. Connect a GitHub repo
3. Copy the `gg_...` token

## License

MIT
