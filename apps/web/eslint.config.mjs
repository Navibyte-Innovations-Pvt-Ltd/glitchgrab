import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwindCanonical from "eslint-plugin-tailwind-canonical-classes";
import unusedImports from "eslint-plugin-unused-imports";
import security from "eslint-plugin-security";
import reactHooks from "eslint-plugin-react-hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "tailwind-canonical": tailwindCanonical,
      "unused-imports": unusedImports,
      security,
      "react-hooks": reactHooks,
    },
    rules: {
      // Tailwind
      "tailwind-canonical/tailwind-canonical-classes": [
        "error",
        {
          cssPath: path.join(__dirname, "app/globals.css"),
        },
      ],

      // Imports
      "unused-imports/no-unused-imports": "error",

      // TypeScript strict
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",

      // Console
      "no-console": ["error", { allow: ["warn", "error", "info"] }],

      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // Next.js
      "@next/next/no-img-element": "error",
      "@next/next/no-page-custom-font": "off",

      // Security — prevent OWASP top 10
      "security/detect-non-literal-regexp": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-child-process": "error",

      // General quality
      "no-return-await": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
