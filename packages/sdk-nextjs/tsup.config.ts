import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "next"],
  // @glitchgrab/report-ui is a private, unpublished workspace package — must be
  // bundled INTO the published `glitchgrab` npm package, not left as an
  // external require() a real consumer can't resolve.
  noExternal: ["@glitchgrab/report-ui"],
  // "use client" is in src/index.ts — no banner needed
});
