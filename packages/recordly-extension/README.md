# @glitchgrab/recordly-extension

`Glitchgrab Script Generator` — a **Recordly in-app plugin**, not a Chrome
extension (don't confuse with `packages/extension`). Runs inside the
**GlitchRecord** desktop app's plugin system (permissions: `timeline`, `ui`,
`cursor`).

Generates AI narration scripts from the browser click events captured during
a recording — the panel behind the "Write script" / "Use AI script" flow in
GlitchRecord's editor.

## Structure

```
src/                          plugin source
recordly-extension.json       plugin manifest (id, permissions, contributes)
build.ts                      esbuild bundler
```

## Build

```bash
bun run build     # → dist/
bun run dev       # build.ts --watch
```

## Plugin manifest

```json
{
  "id": "dev.glitchgrab.script-generator",
  "name": "Glitchgrab Script Generator",
  "permissions": ["timeline", "ui", "cursor"]
}
```

See GlitchRecord's own plugin/extension marketplace docs for how in-app
plugins are loaded and what each permission grants.
