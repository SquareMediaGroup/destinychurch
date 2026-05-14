import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    coverage: {
      provider: "v8",
      include: [
        "lib/**/*.ts",
        "content/**/*.ts",
        "app/**/actions.ts",
      ],
      exclude: ["lib/supabase.ts", "lib/ai/llm-client.ts"],
      reporter: ["text", "html"],
    },
  },
});
