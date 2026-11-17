import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChartLine,
  FileUp,
  PiggyBank,
  ShieldCheck,
  Tags,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const FEATURES = [
  {
    icon: Zap,
    title: "Запись за 5 секунд",
    text: "Кнопка «+» или клавиша N — сумма, категория, готово. Последняя категория запоминается.",
  },
  {
    icon: ChartLine,
    title: "Понятные графики",
    text: "Динамика доходов и расходов, структура трат и сравнение месяцев — без таблиц и формул.",
  },
  {
    icon: Tags,
    title: "Свои категории",
    text: "Иконки и цвета на выбор, архив и перенос операций — порядок без лишней возни.",
  },
  {
    icon: PiggyBank,
    title: "Бюджеты",
    text: "Лимит на кафе или продукты — Salary предупредит на 80% и при превышении.",
  },
  {
    icon: FileUp,
    title: "Импорт и экспорт",
    text: "Загрузите выписку банка в CSV или скачайте свои данные в Excel в любой момент.",
  },
  {
    icon: ShieldCheck,
    title: "Ваши данные — ваши",
    text: "Видны только вам. Удалить аккаунт со всеми данными можно в один клик.",
  },
];

/** Лендинг (tasks.md 14.4). Полностью статический — отдаётся мгновенно. */
export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 sm:px-8">
        <span className="inline-flex items-center gap-2.5 text-xl font-bold">
          <span className="bg-primary/15 text-primary inline-flex size-10 items-center justify-center rounded-full">
            <Wallet className="size-5" />
          </span>
          Salary
        </span>
        <nav className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild variant="ghost">
            <Link href="/login">Войти</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-12 text-center sm:px-8 sm:pt-16">
          <p className="bg-primary/12 text-primary mx-auto mb-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold">
            Персональный финансовый аналитик
          </p>
          <h1 className="mx-auto max-w-3xl text-[40px] leading-[1.1] font-bold tracking-tight sm:text-[56px]">
            Узнайте, куда уходит зарплата
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg">
            Записывайте доходы и расходы за секунды — Salary сам превратит их в понятные графики и
            подскажет, где можно сэкономить.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Начать бесплатно <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">У меня есть аккаунт</Link>
            </Button>
          </div>
        </section>

        <section
          aria-label="Как выглядит приложение"
          className="mx-auto max-w-[1200px] px-4 sm:px-8"
        >
          <div className="glass overflow-hidden rounded-lg p-1.5 sm:p-2">
            <Image
              src="/preview-light.webp"
              alt="Дашборд Salary: баланс, доходы, расходы, график динамики и расходы по категориям"
              width={1440}
              height={820}
              priority
              className="block rounded-md dark:hidden"
            />
            <Image
              src="/preview-dark.webp"
              alt="Дашборд Salary в тёмной теме"
              width={1440}
              height={820}
              className="hidden rounded-md dark:block"
            />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-4 px-4 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glass rounded-lg p-5">
              <span className="bg-primary/12 text-primary mb-3 inline-flex size-11 items-center justify-center rounded-full">
                <Icon className="size-5" />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-muted-foreground mt-1 text-[15px]">{text}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-8">
          <div className="glass flex flex-col items-center gap-4 rounded-lg px-6 py-10 text-center">
            <h2 className="text-[28px] leading-9 font-bold">
              Первый месяц учёта — и всё станет ясно
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Регистрация занимает минуту. Без банковских подключений и рекламы.
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Создать аккаунт <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto max-w-[1200px] px-4 pb-8 text-center text-sm sm:px-8">
        © {2026} Salary
      </footer>
    </div>
  );
}
