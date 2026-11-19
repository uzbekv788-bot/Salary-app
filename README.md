# Salary — персональный финансовый аналитик

Доходы и расходы по категориям, графики динамики, бюджеты, регулярные платежи, цели накоплений, импорт и экспорт CSV. Устанавливается на телефон (PWA) и позволяет записывать траты без интернета. Интерфейс на русском, английском и узбекском.
Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI · Recharts · Prisma 7 · PostgreSQL · Better Auth.

Документация проекта — в [`docs/`](docs): [PRD](docs/PRD.md), [SPEC](docs/SPEC.md), [дизайн](docs/design.md),
[задачи](docs/tasks.md) и [задачи простыми словами](docs/taskGuide.md).

## Открыть в браузере без установки (GitHub Codespaces)

1. На странице репозитория нажмите зелёную кнопку **Code** → вкладка **Codespaces** → **Create codespace on main**.
2. Подождите 3–5 минут: всё установится само (база данных, зависимости, демо-данные), затем приложение запустится.
3. Откроется вкладка с приложением (или нажмите **Open in Browser** во всплывающем окне про порт 3000).
4. Войдите как **demo@salary.app / demo12345**.

У бесплатного аккаунта GitHub есть бесплатные часы Codespaces в месяц. Когда закончите — остановите codespace
(github.com/codespaces → … → Stop), чтобы не тратить часы.

## Быстрый старт (локально)

Нужны **Node.js ≥ 20.9**, **pnpm 10** (`npm install -g pnpm`) и **Docker Desktop** — он поднимет PostgreSQL 16.
Без Docker подойдёт своя PostgreSQL 16: укажите её адрес в `DATABASE_URL`.

1. Распакуйте архив (или склонируйте репозиторий) и откройте терминал в папке `salary`.
2. Создайте файл настроек из шаблона:

```bash
cp .env.example .env
```

В Windows (PowerShell): `Copy-Item .env.example .env`.

3. Сгенерируйте секрет и вставьте его в `.env` в строку `BETTER_AUTH_SECRET="..."`:

```bash
openssl rand -base64 32
```

Если `openssl` нет — подойдёт любая случайная строка длиной от 32 символов.

4. Установите зависимости:

```bash
pnpm install
```

5. Запустите базу данных:

```bash
docker compose up -d
```

6. Создайте таблицы:

```bash
pnpm exec prisma migrate deploy
```

7. (Необязательно) Загрузите демо-данные:

```bash
pnpm db:seed
```

8. Запустите приложение:

```bash
pnpm dev
```

Откройте http://localhost:3000. Если загружали демо-данные — войдите как **demo@salary.app / demo12345**
(операции за 12 месяцев и бюджеты). Или зарегистрируйтесь сами.

В архиве есть папка `.git` с историей коммитов: чтобы загрузить проект в свой GitHub, создайте пустой
репозиторий и выполните `git remote add origin <ссылка>` и `git push -u origin main`.

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
- PRD v1.1 выполнен полностью: регулярные операции, цели, PWA/офлайн-ввод, английский и узбекский языки. Узбекские и английские тексты стоит вычитать носителю языка перед публикацией.
- Офлайн-режим (service worker) включается только в production-сборке (`pnpm build && pnpm start`); в `pnpm dev` его можно включить переменной `NEXT_PUBLIC_SW_DEV=1`. Установка на телефон требует HTTPS — то есть после публикации.
