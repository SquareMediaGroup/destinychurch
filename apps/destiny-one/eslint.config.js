// ESLint for the Destiny One app (eslint-config-expo, flat config). The
// website's config at the repo root ignores apps/, so this file is the one
// `npx expo lint` uses here.
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*", ".expo/*"]),
  expoConfig,
  {
    // React Compiler rules. The app doesn't use the React Compiler, and the
    // existing hits are deliberate patterns (animation and "latest value"
    // refs in the tab bar, ui.tsx and useConversation). Warnings, not errors,
    // until those are reworked and re-tested on a device.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);
