import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Loads .env so the integration test can reach the database.
    setupFiles: ["dotenv/config"],
  },
  resolve: {
    // Mirror the "@/*" -> "./src/*" alias from tsconfig.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
