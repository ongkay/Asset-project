import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", "dist/**", "coverage/**", "test-results/**"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/modules/cdkeys/schemas.ts",
        "src/modules/cdkeys/services.ts",
        "src/modules/cdkeys/actions.ts",
        "src/modules/admin/cdkeys/schemas.ts",
        "src/modules/admin/cdkeys/queries.ts",
        "src/modules/admin/cdkeys/actions.ts",
        "src/app/(admin)/admin/cdkey/_components/cdkey-query.ts",
      ],
    },
  },
});
