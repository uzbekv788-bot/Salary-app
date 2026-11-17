import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config();

/** Интеграционные тесты: настоящая PostgreSQL (TEST_DATABASE_URL), последовательно. */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./tests/stubs/empty.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", NODE_ENV: "test" },
    testTimeout: 20_000,
  },
});
