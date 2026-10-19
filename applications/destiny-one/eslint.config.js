// ESLint for the Destiny One app (eslint-config-expo, flat config). The
// website's config at the repo root ignores applications/, so this file is the one
// `npx expo lint` uses here.
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*", ".expo/*"]),
  expoConfig,
  {
    // React Compiler rules. The app doesn't use the React Compiler, but these
    // catch real render bugs, so they stay errors.
    rules: {
      "react-hooks/refs": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/preserve-manual-memoization": "error",
      // tsc already checks namespace members. eslint-plugin-import's export
      // scanner misses SDK 58's compiled enums (expo-notifications'
      // `export var AndroidImportance` follows a comment on the same line) and
      // reports them as missing.
      "import/namespace": "off",
    },
  },
]);
