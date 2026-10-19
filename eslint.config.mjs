import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react-hooks 7.1 (eslint-config-next 16.4) flags more React
    // Compiler readiness patterns — fetch-on-mount setState and "latest value"
    // refs written during render. Existing code is correct as written; keep the
    // hints visible as warnings while it's migrated rather than failing CI.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
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
    "applications/destiny-one/**",
    // D1 Admin, the Tauri desktop app — its own package and checks (CI job d1-admin).
    "applications/d1-admin/**",
    // Destiny Subtitles, the Rust + Tauri captioning app: its own package (CI job destiny-subtitles).
    "applications/destiny-subtitles/**",
    // Talent show buzzers: standalone Node/CommonJS app with its own package.json.
    "applications/talent-buzzer/**",
    // Agent worktrees are full copies of the app, gitignored; linting them
    // would report every problem twice.
    ".claude/**",
  ]),
]);

export default eslintConfig;
