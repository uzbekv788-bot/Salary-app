# SPEC — Salary: техническая спецификация

> Связанные документы: `PRD.md` (что и зачем), `design.md` (как выглядит), `tasks.md` (порядок работ).

---

## 1. Технологический стек

| Слой           | Технология                                                                     | Почему                                                                                  |
| -------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Фреймворк      | **Next.js 16** (App Router, React 19, Cache Components)                        | Server Components, Server Actions, частичный пререндер (PPR)                            |
| Стили          | **Tailwind CSS v4**                                                            | Токены дизайна в `@theme`, быстрая вёрстка                                              |
| UI-компоненты  | Компоненты в стиле **shadcn/ui** на **Radix UI** (`radix-ui`), шторки — `vaul` | Доступные примитивы, полный контроль над кодом                                          |
| Иконки         | **lucide-react**                                                               | Требование design.md                                                                    |
| Графики        | **Recharts**                                                                   | Area/Line/Bar/Pie, кастомные тултипы, SSR-безопасен как client component                |
| Анимации       | **motion** (Framer Motion)                                                     | Появление, модалки, stagger                                                             |
| Тема           | **next-themes**                                                                | Светлая/тёмная/системная                                                                |
| БД             | **PostgreSQL** (Neon / Supabase)                                               | Агрегации `GROUP BY`, `date_trunc`                                                      |
| ORM            | **Prisma 7** (driver adapter `@prisma/adapter-pg`)                             | Типобезопасность, миграции                                                              |
| Аутентификация | **Better Auth** 1.7 + Prisma adapter                                           | Email/пароль из коробки, Google, встроенный rate-limit; Auth.js v5 так и остался в beta |
| Валидация      | **zod**                                                                        | Общие схемы для клиента и сервера                                                       |
| Формы          | **react-hook-form** + `@hookform/resolvers/zod`                                |                                                                                         |
| Даты           | **date-fns** + `date-fns-tz` (locale `ru`)                                     |                                                                                         |
| CSV            | **papaparse**                                                                  | Импорт/экспорт                                                                          |
| Тесты          | **Vitest** + Testing Library (unit), **Playwright** (e2e)                      |                                                                                         |
| Качество       | ESLint, Prettier, Husky + lint-staged                                          |                                                                                         |
| Деплой         | **Vercel** + Neon Postgres                                                     |                                                                                         |

Менеджер пакетов: **pnpm**. Node.js ≥ 20.

---

## 2. Структура проекта

```
salary/
├─ app/
│  ├─ (marketing)/page.tsx              # Лендинг
│  ├─ (auth)/login/page.tsx
│  ├─ (auth)/register/page.tsx
│  ├─ (app)/layout.tsx                  # Сайдбар + таббар + проверка сессии
│  ├─ (app)/onboarding/page.tsx
│  ├─ (app)/dashboard/page.tsx
│  ├─ (app)/transactions/page.tsx
│  ├─ (app)/categories/page.tsx
│  ├─ (app)/analytics/page.tsx
│  ├─ (app)/budgets/page.tsx
│  ├─ (app)/settings/page.tsx
│  ├─ api/auth/[...nextauth]/route.ts
│  ├─ api/export/route.ts               # GET → CSV-файл
│  ├─ globals.css                       # Токены дизайна
│  └─ layout.tsx                        # Шрифт Inter, ThemeProvider
├─ components/
│  ├─ ui/                               # shadcn (button, dialog, input, ...)
│  ├─ layout/                           # Sidebar, TabBar, PageHeader, PeriodPicker
│  ├─ charts/                           # TrendAreaChart, CategoryDonut, MonthBars, Sparkline
│  ├─ transactions/                     # TransactionForm, TransactionList, Filters
│  ├─ categories/                       # CategoryIcon, CategoryForm
│  └─ dashboard/                        # KpiCard, RecentTransactions
├─ lib/
│  ├─ db.ts                             # Prisma client singleton
│  ├─ auth.ts                           # Конфиг Better Auth
│  ├─ money.ts                          # toMinor/fromMinor/formatMoney
│  ├─ period.ts                         # Расчёт диапазонов периодов
│  ├─ validators/                       # zod-схемы
│  ├─ actions/                          # Server Actions (мутации)
│  ├─ queries/                          # Чтение данных и агрегации
│  └─ design/category-palette.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                           # Демо-пользователь с данными за 12 мес.
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ docs/                                # PRD, SPEC, design, tasks, taskGuide
```

---

## 3. Модель данных (Prisma)

```prisma
enum TxType { INCOME EXPENSE }
enum AccountType { CARD CASH SAVINGS OTHER }

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  currency      String    @default("RUB")      // ISO 4217
  timezone      String    @default("Europe/Moscow")
  onboarded     Boolean   @default(false)
  createdAt     DateTime  @default(now())

  accounts      Account[]      // OAuth и пароли (Better Auth)
  sessions      Session[]
  wallets       Wallet[]
  categories    Category[]
  transactions  Transaction[]
  budgets       Budget[]
}

model Wallet {                       // «Счёт» в интерфейсе
  id             String      @id @default(cuid())
  userId         String
  name           String
  type           AccountType @default(CARD)
  initialBalance BigInt      @default(0)        // в минорных единицах
  archived       Boolean     @default(false)
  createdAt      DateTime    @default(now())
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   Transaction[]
  @@index([userId])
}

model Category {
  id        String   @id @default(cuid())
  userId    String
  name      String
  type      TxType
  icon      String                               // имя иконки Lucide
  color     String                               // ключ палитры: emerald|sky|...
  archived  Boolean  @default(false)
  sortOrder Int      @default(0)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets   Budget[]
  @@unique([userId, type, name])
  @@index([userId, type])
}

model Transaction {
  id         String   @id @default(cuid())
  userId     String
  type       TxType
  amount     BigInt                              // > 0, в минорных единицах
  date       DateTime @db.Date                   // без времени
  note       String?  @db.VarChar(200)
  categoryId String
  walletId   String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?                           // мягкое удаление для «Отменить»
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  wallet     Wallet   @relation(fields: [walletId], references: [id], onDelete: Restrict)
  @@index([userId, date])
  @@index([userId, categoryId, date])
}

model Budget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  month      DateTime @db.Date                   // первое число месяца
  limit      BigInt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([userId, categoryId, month])
}

// + модели Better Auth: Account (здесь же хеш пароля), Session, Verification
```

### Правила

- **Деньги** — `BigInt` в минорных единицах. На клиент передаются как `number` (безопасно до 9·10¹⁵) через `lib/money.ts`.
- **Дата операции** — `DATE`; «сегодня» вычисляется в часовом поясе пользователя.
- **Мягкое удаление** операций: `deletedAt` выставляется сразу, запись физически удаляется cron-задачей через 24 ч (или отменяется кнопкой «Отменить»). Все запросы фильтруют `deletedAt IS NULL`.
- **Баланс счёта** = `initialBalance + Σ доходов − Σ расходов` (вычисляется, не хранится).

---

## 4. Маршруты и доступ

| Путь                  | Доступ                         | Содержимое                                                      |
| --------------------- | ------------------------------ | --------------------------------------------------------------- |
| `/`                   | публичный                      | Лендинг                                                         |
| `/login`, `/register` | только гости                   | Формы входа/регистрации                                         |
| `/onboarding`         | авторизован, `onboarded=false` | Мастер из 3 шагов                                               |
| `/dashboard`          | авторизован                    | KPI, «Динамика», донат, последние операции                      |
| `/transactions`       | авторизован                    | Список + фильтры (состояние в URL query)                        |
| `/categories`         | авторизован                    | Вкладки «Расходы/Доходы», CRUD                                  |
| `/analytics`          | авторизован                    | Сравнение месяцев, топ категорий, средние                       |
| `/budgets`            | авторизован                    | Лимиты на текущий месяц                                         |
| `/settings`           | авторизован                    | Профиль, валюта, тема, счета, импорт/экспорт, удаление аккаунта |

`proxy.ts` (в Next 16 `middleware` переименован в `proxy`): по наличию cookie сессии неавторизованных → `/login`; авторизованных без онбординга → `/onboarding`.

**Состояние периода** хранится в URL: `?period=month&date=2026-11` или `?from=2026-01-01&to=2026-03-31`, + `&wallet=<id>`. Так ссылки делимы, а Server Components читают `searchParams`.

---

## 5. Server Actions (мутации)

Все в `lib/actions/*`, каждая: (1) получает сессию → `userId`, (2) валидирует вход zod, (3) проверяет принадлежность связанных сущностей пользователю, (4) пишет в БД, (5) `revalidatePath`, (6) возвращает `{ ok: true, data } | { ok: false, error, fieldErrors? }`.

| Action                                                  | Вход                                                       | Примечание                                      |
| ------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `register`                                              | email, password (≥ 8), name                                | hash argon2                                     |
| `completeOnboarding`                                    | currency, categoryKeys[], wallet{name,type,initialBalance} | Транзакция БД                                   |
| `createTransaction`                                     | type, amount, categoryId, walletId, date, note?            | type категории должен совпадать                 |
| `updateTransaction`                                     | id + те же поля                                            |                                                 |
| `deleteTransaction` / `restoreTransaction`              | id                                                         | мягкое удаление                                 |
| `createCategory` / `updateCategory` / `archiveCategory` | name, type, icon, color                                    |                                                 |
| `mergeCategory`                                         | fromId, toId                                               | Перенос операций, затем удаление                |
| `createWallet` / `updateWallet` / `archiveWallet`       |                                                            |                                                 |
| `upsertBudget` / `deleteBudget`                         | categoryId, month, limit                                   | Только категории EXPENSE                        |
| `importCsv`                                             | file, mapping                                              | Предпросмотр на клиенте, вставка пачками по 500 |
| `updateProfile`                                         | name, currency, timezone                                   |                                                 |
| `deleteAccount`                                         | подтверждение email                                        | Каскадное удаление                              |

### zod-схема операции (пример)

```ts
export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive().max(1_000_000_000), // в основных единицах, на сервере → toMinor
  categoryId: z.string().cuid(),
  walletId: z.string().cuid(),
  date: z.coerce.date(),
  note: z.string().max(200).optional(),
});
```

---

## 6. Запросы аналитики (`lib/queries/analytics.ts`)

Все агрегации выполняются в БД (`prisma.$queryRaw` с параметрами), а не в JS.

| Функция                                    | Возвращает                                               | SQL-идея                                                                                                                          |
| ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `getKpis(userId, range, walletId?)`        | `{ income, expense, balance, savingsRate, prev: {...} }` | `SUM(amount) FILTER (WHERE type=...)` за range и за предыдущий range той же длины                                                 |
| `getTrend(userId, range, granularity)`     | `[{ bucket, income, expense, cumulativeBalance }]`       | `date_trunc(granularity, date)` + `generate_series` для пустых дней; кумулятивный баланс — оконная `SUM() OVER (ORDER BY bucket)` |
| `getByCategory(userId, range, type)`       | `[{ categoryId, name, icon, color, total, share }]`      | `GROUP BY categoryId ORDER BY total DESC`; > 7 → «Прочее»                                                                         |
| `getMonthComparison(userId, months=6\|12)` | `[{ month, income, expense }]`                           | `date_trunc('month')`                                                                                                             |
| `getDailyAverage(userId, range)`           | `{ avgExpensePerDay, maxDay }`                           |                                                                                                                                   |
| `getBudgetsProgress(userId, month)`        | `[{ category, limit, spent, pct, status }]`              | JOIN budgets ↔ SUM расходов; status: ok < 80 ≤ warning ≤ 100 < over                                                               |

**Гранулярность тренда:** неделя/месяц → по дням; квартал → по неделям; год/произвольный > 92 дней → по месяцам.

**Изменение к прошлому периоду:** `delta = prev === 0 ? null : (cur − prev) / prev`. При `null` — показывать «—».

**Норма сбережений:** `income > 0 ? (income − expense) / income : null`.

---

## 7. Компоненты графиков

Все графики — client components (`"use client"`), данные получают пропсами из Server Component страницы (без клиентских запросов).

| Компонент        | Recharts                                            | Props                                                               |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `TrendAreaChart` | `AreaChart` + 2–3 `Area`, `linearGradient` в `defs` | `data`, `series: ('income'\|'expense'\|'balance')[]`, `granularity` |
| `CategoryDonut`  | `PieChart` + `Pie innerRadius="70%"`                | `data`, `total`, `currency`                                         |
| `MonthBars`      | `BarChart` сгруппированный                          | `data`                                                              |
| `Sparkline`      | `LineChart` без осей                                | `points: number[]`, `tone`                                          |
| `ChartTooltip`   | кастомный `content`                                 | общий стеклянный тултип                                             |

Цвета берутся из CSS-переменных (`var(--income)` и т. д.), поэтому графики автоматически меняются при смене темы. Анимация Recharts (`isAnimationActive`) выключается при `prefers-reduced-motion`.

---

## 8. Утилиты

- `lib/money.ts`: `toMinor(12.5) → 1250n`, `fromMinor(1250n) → 12.5`, `formatMoney(1250n, 'RUB') → "12,50 ₽"`, `formatCompact(1_250_000) → "1,3 млн"`.
- `lib/period.ts`: `resolvePeriod(searchParams, tz) → { from, to, prevFrom, prevTo, granularity, label }`.
- `lib/csv.ts`: колонки экспорта `date,type,amount,category,wallet,note`; импорт — автоопределение разделителя и формата даты (`dd.MM.yyyy`, `yyyy-MM-dd`), отрицательные суммы → расход.

---

## 9. Безопасность

- Каждый запрос в `lib/queries` и `lib/actions` принимает `userId` **только из сессии**, никогда из клиента.
- Проверка владения: при создании операции — `category.userId === userId && wallet.userId === userId`.
- Rate-limit на `/login` и `register`: 5 попыток / 15 мин по IP (Upstash Ratelimit или in-memory в dev).
- Заголовки: CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Секреты только в переменных окружения: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

---

## 10. Производительность

- Страницы — Server Components; клиентские только формы, графики, интерактивные фильтры.
- Recharts грузится через `next/dynamic` только на страницах с графиками.
- Индексы `(userId, date)` и `(userId, categoryId, date)`.
- Список операций — пагинация курсором по `(date DESC, id DESC)`, 50 на страницу, «Загрузить ещё»/infinite scroll.
- Оптимистичные обновления при добавлении/удалении (`useOptimistic`).

---

## 11. Тестирование

| Уровень        | Что                                                                                                       | Инструмент                             |
| -------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Unit           | `money.ts`, `period.ts`, `csv.ts`, zod-схемы, расчёт delta/savingsRate                                    | Vitest                                 |
| Интеграционные | Server Actions и queries на тестовой БД (Docker Postgres) — включая проверку, что чужие данные недоступны | Vitest                                 |
| Компоненты     | KpiCard, TransactionForm (валидация), CategoryIcon                                                        | Testing Library                        |
| E2E            | Регистрация → онбординг → добавить расход и доход → KPI обновились → бюджет предупреждает → экспорт CSV   | Playwright (desktop + mobile viewport) |
| Доступность    | axe на ключевых страницах в e2e                                                                           | `@axe-core/playwright`                 |

CI (GitHub Actions): `lint → typecheck → unit → build → e2e` на каждый PR.

---

## 12. Окружения и деплой

| Окружение  | БД                       | URL              |
| ---------- | ------------------------ | ---------------- |
| local      | Docker Postgres 16       | `localhost:3000` |
| preview    | Neon branch на каждый PR | Vercel preview   |
| production | Neon main                | Vercel prod      |

`prisma migrate deploy` выполняется в build-шаге Vercel. Сид демо-данных — только local/preview.

---

## 13. Критерии готовности MVP (Definition of Done)

- Все Must-требования из PRD реализованы и покрыты e2e-сценарием.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95.
- Нет ошибок TypeScript и ESLint; покрытие unit-тестами `lib/` ≥ 80%.
- Проверено в Chrome, Safari (iOS), Firefox; в обеих темах; на ширинах 360 / 768 / 1280 / 1920.

---

## 14. Отличия реализации от первоначального плана

| Решение                                         | Почему                                                                                                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 вместо 15                            | Актуальная стабильная версия на момент старта. `middleware` → `proxy.ts`; с `cacheComponents` всё, что читает сессию, рендерится внутри `<Suspense>` (статическая оболочка + стриминг). |
| Better Auth вместо Auth.js                      | Auth.js v5 так и не вышел из beta; вход по паролю в нём не рекомендуется. Better Auth даёт email/пароль, Google и лимит попыток из коробки.                                             |
| Prisma 7                                        | Новый генератор `prisma-client` (`lib/generated/prisma`), подключение через `@prisma/adapter-pg`, настройки в `prisma.config.ts`.                                                       |
| Список операций: «Показать ещё» через `?limit=` | Проще курсорной пагинации и сохраняет ссылку; при объёмах до тысяч операций на период разницы нет.                                                                                      |
| «Прошлый период» = предыдущий календарный       | Ноябрь сравнивается с октябрём; текущий незавершённый — с тем же числом дней (1–17 ноября против 1–17 октября).                                                                         |
| Динамика по дням — нарастающим итогом           | Дневные суммы «пиковые» (зарплата 2 раза в месяц); накопленные линии читаются лучше.                                                                                                    |
| Цвета графиков отделены от цветов текста        | Пара доход/расход проверена `validate_palette.js` на различимость при дейтеранопии (см. design.md §2.1).                                                                                |
| Донат: максимум 5 сегментов + легенда-список    | Цвета категорий выбирает пользователь, 8 цветов нельзя сделать попарно различимыми — смысл дублируется иконкой и подписью.                                                              |

---

## 15. v1.1: регулярные операции и цели

### Модель данных

```prisma
enum Frequency { WEEKLY MONTHLY YEARLY }

model RecurringRule {            // «зарплата каждый месяц 10-го»
  type TxType; amount BigInt; categoryId; walletId; note?
  frequency Frequency; interval Int @default(1)   // каждые N недель/месяцев/лет
  startDate @db.Date; endDate? @db.Date
  count Int       // сколько повторений создано = номер следующего
  nextDate @db.Date  // = occurrence(startDate, count)
  active Boolean
}
// Transaction.recurringId → RecurringRule (onDelete: SetNull — история остаётся)

model Goal { name; icon; color; target BigInt; deadline? @db.Date; completedAt? }
model GoalContribution { goalId; amount BigInt (> 0 пополнение, < 0 снятие); date; note? }
```

### Создание операций по правилам

- `lib/recurring.ts` — чистые функции: `occurrence(start, freq, interval, k)` считает k-ю дату **от даты начала** (31 янв → 28 фев → 31 мар), `dueOccurrences` — какие даты пора создать (не больше 400 за проход).
- `lib/recurring-server.ts` → `materializeRecurring(userId, tz)` вызывается из `requireUser()` один раз за запрос (React `cache`). Отдельный cron не нужен: пропущенные даты досоздаются при следующем визите.
- Защита от дублей: в транзакции `UPDATE recurring_rule SET count = новое … WHERE id = ? AND count = старое`; операции создаются, только если строка обновилась. Параллельный запрос получает 0 строк.
- Пауза: `active = false`. При возобновлении пропущенные даты **не** создаются — `nextDate` переносится на ближайшую дату ≥ сегодня.
- Изменение расписания (частота, интервал, следующая дата) переякоривает правило: `startDate = nextDate`, `count = 0`. Уже созданные операции не меняются.
- Категорию с правилами нельзя удалить без переноса (правила переезжают вместе с операциями).

### Маршруты и действия

| Путь         | Содержимое                                                                             |
| ------------ | -------------------------------------------------------------------------------------- |
| `/recurring` | Сводка «в месяц приходит/уходит» (`monthlyEquivalent`), список правил, пауза, удаление |
| `/goals`     | Цели с прогрессом, «≈ N ₽ в месяц» (`lib/goals.ts → monthlyNeeded`), пополнения/снятия |

Server Actions (`lib/actions/planning.ts`): `saveRecurring`, `setRecurringActive`, `deleteRecurring`, `saveGoal`, `deleteGoal`, `addContribution` (возвращает `justCompleted` для поздравления; снять больше накопленного нельзя). `saveTransaction(input, id?, repeat?)` — новая операция с `repeat` становится повторением №0 нового правила.

Тесты: `tests/unit/recurring.test.ts`, `tests/integration/planning.test.ts` (параллельные запросы без дублей, пауза, перенос категории, цели, изоляция), e2e «v1.1» + axe для `/recurring` и `/goals`.

---

## 16. v1.1: PWA и офлайн-ввод

| Часть           | Реализация                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Манифест        | `app/manifest.ts`: `start_url: /dashboard`, `display: standalone`, иконки 192/512 + maskable 512, ярлыки. `app/icon.svg`, `app/apple-icon.png`, `appleWebApp` в metadata                                       |
| Service worker  | `public/sw.js` (обычный JS, без сборщика), регистрируется `components/pwa/sw-register.tsx` только в production (`NEXT_PUBLIC_SW_DEV=1` — включить в dev). Заголовки для `/sw.js`: `no-cache`, свой CSP         |
| Стратегии       | `/_next/static`, иконки, шрифты — cache-first. Навигация — network-first → сохранённая копия страницы → `/offline`. RSC-запросы и `/api/*` не кэшируются. Со страницей кэшируются её `/_next/static/*` из HTML |
| Личные данные   | Кэш страниц `salary-pages-*` удаляется при выходе (`clearOfflineData`)                                                                                                                                         |
| Офлайн-очередь  | `lib/offline-queue.ts` (IndexedDB `salary-offline`), записи с `userId` и `clientId` (UUID). `components/offline/offline-sync.tsx` — плашка и отправка (online / visibilitychange / загрузка)                   |
| Идемпотентность | `Transaction.clientId`, `@@unique([userId, clientId])`. `saveTransaction` сначала ищет по `clientId`, при гонке ловит `P2002` и возвращает существующую операцию (лишнее регулярное правило откатывается)      |

Почему не `experimental.useOffline` из Next.js 16: он задерживает Server Action до появления сети — форма зависает в «Сохраняем…», а закрытая вкладка теряет запись. Своя очередь в IndexedDB переживает перезагрузку и закрытие приложения.

Ограничения: без сети можно только добавлять операции (не изменять/удалять); экраны, ни разу не открытые с сетью, показывают `/offline`; установка требует HTTPS (кроме localhost).
