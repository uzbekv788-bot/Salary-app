import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Адрес базы — из .env. Для `prisma generate` (запускается при pnpm install) он не нужен,
    // поэтому установка зависимостей не падает, если .env ещё не создан.
    url: process.env.DATABASE_URL ?? "",
  },
});
