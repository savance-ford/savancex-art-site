import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "playwright-report/**",
    "test-results/**",
    "reference-static/**",
    "next-env.d.ts",
    "app.js",
    "data.js",
    "serve.mjs",
  ]),
]);
