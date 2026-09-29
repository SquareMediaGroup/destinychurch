import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
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
    "next-env.d.ts",
    // The mobile app (React Native/Expo) has its own toolchain and lint config.
    "mobile/**",
    // Destiny One, the Expo messaging app — its own toolchain too.
    "apps/destiny-one/**",
    // Agent worktrees are full copies of the app, gitignored; linting them
    // would report every problem twice.
    ".claude/**",
  ]),
]);

export default eslintConfig;
