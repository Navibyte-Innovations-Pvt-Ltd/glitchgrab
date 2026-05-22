import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  ...tseslint.configs.recommendedTypeChecked,

  reactPlugin.configs.flat["jsx-runtime"],

  reactHooksPlugin.configs["recommended-latest"],

  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        __DEV__: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false, properties: false } },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-require-imports": [
        "error",
        { allow: ["\\.(png|jpg|jpeg|gif|webp|svg)$"] },
      ],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],

      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true } },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "react/display-name": "off",
    },
  },

  {
    ignores: [
      "eslint.config.mjs",
      "babel.config.js",
      "metro.config.js",
      "patches/**",
      "plugins/**",
      "scripts/**",
      // Legacy files kept for git history — superseded by expo-router + Tamagui rewrite
      "App.tsx",
      "src/api.ts",
      "src/screens/**",
      ".expo/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "dist/**",
    ],
  },
]);
