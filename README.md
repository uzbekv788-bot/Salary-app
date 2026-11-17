# Salary — персональный финансовый аналитик

Доходы и расходы по категориям, графики динамики, бюджеты, импорт и экспорт CSV.
Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI · Recharts · Prisma 7 · PostgreSQL · Better Auth.

Документация проекта — в [`docs/`](docs): [PRD](docs/PRD.md), [SPEC](docs/SPEC.md), [дизайн](docs/design.md),
[задачи](docs/tasks.md) и [задачи простыми словами](docs/taskGuide.md).

## Быстрый старт (локально)

Нужны Node.js ≥ 20.9, pnpm 10 и Docker (или своя PostgreSQL 16).

```bash
pnpm install
```

```bash
cp .env.example .env
```

Впишите в `.env` секрет `BETTER_AUTH_SECRET` (сгенерировать: `openssl rand -base64 32`).

```bash
docker compose up -d
```

```bash
pnpm exec prisma migrate deploy
```

```bash
pnpm db:seed
```

```bash
pnpm dev
```

Откройте http://localhost:3000 и войдите как **demo@salary.app / demo12345** — у демо-пользователя операции за 12 месяцев и бюджеты.

## Команды

| Команда                                               | Что делает                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                                            | Сервер разработки                                                          |
| `pnpm build` / `pnpm start`                           | Production-сборка и запуск                                                 |
| `pnpm lint` / `pnpm typecheck` / `pnpm format`        | Проверки кода                                                              |
| `pnpm test`                                           | Unit-тесты (деньги, периоды, CSV)                                          |
| `pnpm db:test:migrate` затем `pnpm test:integration`  | Интеграционные тесты на тестовой БД (`TEST_DATABASE_URL`)                  |
| `pnpm exec playwright test --trace off`               | E2E на десктопе и мобильном + проверка доступности axe (нужны демо-данные) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Миграции, демо-данные, просмотр БД                                         |

Если после правки `app/globals.css` стили в `pnpm dev` не обновились — удалите кэш: `rm -rf .next` и перезапустите.

## Деплой (Vercel + Neon)

1. **База данных.** Создайте проект в [Neon](https://neon.tech) и скопируйте строку подключения (с `?sslmode=require`).
2. **Репозиторий.** Загрузите код на GitHub — CI из `.github/workflows/ci.yml` запустится автоматически.
3. **Vercel.** Импортируйте репозиторий и задайте переменные окружения:
   - `DATABASE_URL` — строка из Neon;
   - `BETTER_AUTH_SECRET` — новый случайный секрет (`openssl rand -base64 32`);
   - `BETTER_AUTH_URL` — адрес сайта, например `https://salary.vercel.app`;
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — по желанию (без них кнопка Google скрыта).
4. **Build command:** `prisma migrate deploy && next build` (миграции применяются при каждом деплое).
5. **Google OAuth** (по желанию): в Google Cloud Console → Credentials добавьте redirect URI
   `https://<ваш-домен>/api/auth/callback/google`.
6. **Проверка после выкладки:** регистрация → онбординг → добавить расход → дашборд.
   Демо-данные (`pnpm db:seed`) на production не запускайте.

## Безопасность

- Все запросы к данным фильтруются по `userId` из сессии; изоляция проверяется интеграционными тестами.
- Пароли хешируются (Better Auth, scrypt), сессии — httpOnly-cookie, лимит 5 попыток входа за 15 минут в production.
- Заголовки: `X-Frame-Options: DENY`, `HSTS`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Деньги хранятся целыми числами в копейках (`BigInt`), без ошибок округления.

## Известные ограничения и что дальше

- Lighthouse (mobile): лендинг 96, «Операции» 92, «Аналитика» 82, «Дашборд» 76 — основной вклад в задержку
  на дашборде даёт гидратация графиков Recharts. Accessibility — 100 на всех страницах.
- Content-Security-Policy пока не задана (нужны nonce для inline-скриптов Next.js).
- Удалённые операции помечаются `deletedAt` и физически не стираются — нужна фоновая очистка старше 24 часов.
- Из PRD v1.1 не сделаны: регулярные операции, цели накоплений, PWA/офлайн, английский и узбекский языки.
