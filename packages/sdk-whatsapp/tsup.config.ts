import { defineConfig } from "tsup";

export default defineConfig({
  // Two entries on purpose: the server client must be importable from a route
  // handler without dragging React in, and the React entry must never be
  // bundled into a server build.
  entry: ["src/index.ts", "src/react.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
});
