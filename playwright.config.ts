import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (tasks.md 13.3–13.4). Требует запущенную БД с демо-данными (pnpm db:seed).
 * Локально переиспользует уже запущенный `pnpm dev`, в CI — поднимает `pnpm start`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
