import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Ключевой сценарий PRD §9 на десктопе и мобильном. */

async function addTransaction(
  page: Page,
  opts: { type: "Расход" | "Доход"; amount: string; category: string; note: string },
) {
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  await page
    .getByRole("button", { name: mobile ? "Добавить операцию" : "Добавить" })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: opts.type }).click();
  await sheet.getByLabel("Сумма").fill(opts.amount);
  await sheet.getByRole("radio", { name: opts.category }).click();
  await sheet.getByLabel("Комментарий").fill(opts.note);
  await sheet.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(sheet).toBeHidden();
}

test("регистрация → онбординг → доход и расход → бюджет → экспорт", async ({ page }) => {
  const email = `e2e-${Date.now()}-${test.info().project.name}@test.dev`;

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/register");
  await page.getByLabel("Имя").fill("Аня");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("secret123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();

  await expect(page.getByRole("heading", { name: /Привет, Аня/ })).toBeVisible();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByLabel("Сколько на нём сейчас").fill("10 000");
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Пока нет операций")).toBeVisible();

  await addTransaction(page, {
    type: "Доход",
    amount: "50000",
    category: "Зарплата",
    note: "Аванс",
  });
  await addTransaction(page, {
    type: "Расход",
    amount: "1250,50",
    category: "Кафе и рестораны",
    note: "Обед",
  });

  await expect(page.getByLabel(/^Доходы: 50\s000/)).toBeVisible();
  await expect(page.getByLabel(/^Расходы: 1\s251/)).toBeVisible();
  await expect(page.getByLabel(/^Баланс: 58\s750/)).toBeVisible();

  await page.goto("/budgets");
  await page.getByRole("button", { name: "Новый бюджет" }).click();
  await page.getByLabel("Категория расходов").selectOption({ label: "Кафе и рестораны" });
  await page.getByLabel("Лимит на месяц").fill("1500");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Почти исчерпан")).toBeVisible();

  await addTransaction(page, {
    type: "Расход",
    amount: "400",
    category: "Кафе и рестораны",
    note: "Кофе",
  });
  await expect(page.getByText(/Бюджет «Кафе и рестораны» превышен/)).toBeVisible();

  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "За всё время" }).click(),
  ]);
  const csv = await (await download.createReadStream()).toArray();
  const text = Buffer.concat(csv).toString("utf8");
  expect(text).toContain("income;50000,00;Зарплата");
  expect(text.trim().split("\n")).toHaveLength(4);
});

test("v1.1: регулярный платёж из формы и цель с пополнением", async ({ page }) => {
  const email = `e2e-v11-${Date.now()}-${test.info().project.name}@test.dev`;
  await page.goto("/register");
  await page.getByLabel("Имя").fill("Тимур");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("secret123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Расход с повторением «каждый месяц»
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  await page
    .getByRole("button", { name: mobile ? "Добавить операцию" : "Добавить" })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Сумма").fill("399");
  await sheet.getByRole("radio", { name: "Связь и подписки" }).click();
  await sheet.getByLabel("Комментарий").fill("Музыка");
  await sheet.getByLabel("Повторять").selectOption("MONTHLY");
  await sheet.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(sheet).toBeHidden();

  await page.goto("/recurring");
  await expect(page.getByText("Музыка")).toBeVisible();
  await expect(page.getByText(/Каждый месяц, \d+-го/)).toBeVisible();
  await expect(page.getByText("−399 ₽").first()).toBeVisible();

  // Цель: создать и пополнить до конца → поздравление
  await page.goto("/goals");
  await page.getByRole("button", { name: "Новая цель" }).click();
  await page.getByLabel("Название").fill("Наушники");
  await page.getByLabel("Сколько нужно").fill("10000");
  await page.getByRole("button", { name: "Создать цель" }).click();
  await expect(page.getByText("Наушники")).toBeVisible();
  await page.getByRole("button", { name: "Пополнить / снять" }).click();
  await page.getByLabel("Сумма").fill("10000");
  await page.getByRole("button", { name: "Отложить" }).click();
  await expect(page.getByText(/Цель «Наушники» достигнута/)).toBeVisible();
  await expect(page.getByText("Достигнутые (1)")).toBeVisible();
});

test.describe("доступность (axe, WCAG AA)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo@salary.app");
    await page.getByLabel("Пароль").fill("demo12345");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  for (const path of [
    "/dashboard",
    "/transactions",
    "/analytics",
    "/budgets",
    "/categories",
    "/settings",
    "/recurring",
    "/goals",
  ]) {
    test(`${path} без серьёзных нарушений`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} → ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
});
