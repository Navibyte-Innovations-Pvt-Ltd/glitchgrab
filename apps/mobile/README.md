# @glitchgrab/mobile

React Native (Expo) mobile app. **WebView-based** — wraps `apps/web`'s
dashboard in a `react-native-webview`; all UI lives in the web app, this shell
just handles auth, deep links, and share intent.

Pinned to **Expo SDK 53 / RN 0.79.6** — do not upgrade to SDK 55/RN 0.83, it
crashes with a `PlatformConstants` error on this app's native module setup.

## Commands

```bash
bun run dev            # expo run:ios --device "iPhone 17" --port 8085
bun run start           # expo start --dev-client
bun run android         # expo run:android
bun run ios             # expo run:ios
bun run ios:clean       # expo prebuild --clean && expo run:ios
bun run prebuild        # expo prebuild
bun run eas-build        # eas build
bun run check-types      # tsc --noEmit
bun run lint             # eslint . --max-warnings 0
bun run lint:fix
```

## Architecture

- **Auth**: GitHub OAuth via `expo-auth-session` → exchange code at
  `/api/auth/mobile` → session token in `expo-secure-store` → WebView loads
  `/api/auth/mobile/session?token=...`, which sets a cookie and redirects to
  `/dashboard`.
- **Share intent**: images shared from other apps arrive as base64, injected
  into the WebView as a paste event on the chat textarea.
- **Deep links**: `glitchgrab://` scheme, plus
  `https://glitchgrab.dev/collaborate` for collaborator invites.
- **Collaborator mode**: a separate flow where the WebView loads a collab
  accept URL instead of the main dashboard.

## WebView gotchas

- Global CSS disables `backdrop-filter`/`animation-duration`/
  `transition-duration` for `.webview *` — MediaTek GPUs crash on those inside
  a WebView otherwise. The web app injects a `webview` class on `<html>` to
  scope this.
- Sheet menu navigation uses `window.location.href` (full page nav) instead of
  `router.push` inside the WebView — client-side nav during Radix portal
  teardown froze the GPU on affected devices. Detected via
  `document.documentElement.classList.contains("webview")`.
- Avoid injecting JS that runs on every scroll/resize frame; use
  `requestAnimationFrame` for layout recalculations.
