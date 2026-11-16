/*
 * eslint.config.mjs
 * Combines Next.js accessibility/performance and TypeScript lint rules. Build output and temporary local files are ignored so lint focuses on maintained source.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the existing ESLint configuration helpers/rules so project checks understand Next.js and TypeScript syntax.
import { defineConfig, globalIgnores } from "eslint/config";
// Import the existing ESLint configuration helpers/rules so project checks understand Next.js and TypeScript syntax.
import nextVitals from "eslint-config-next/core-web-vitals";
// Import the existing ESLint configuration helpers/rules so project checks understand Next.js and TypeScript syntax.
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".local/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
