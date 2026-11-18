import { Suspense } from "react";
import Image from "next/image";
import Link from "@/components/i18n/link";
import {
  ArrowRight,
  ChartLine,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Wallet,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getI18n } from "@/lib/i18n/server";

const FEATURES = [
  { icon: Zap, title: "landing.f1t", text: "landing.f1" },
  { icon: ChartLine, title: "landing.f2t", text: "landing.f2" },
  { icon: Repeat, title: "landing.f3t", text: "landing.f3" },
  { icon: PiggyBank, title: "landing.f4t", text: "landing.f4" },
  { icon: WifiOff, title: "landing.f5t", text: "landing.f5" },
  { icon: ShieldCheck, title: "landing.f6t", text: "landing.f6" },
] as const;

/** Лендинг (tasks.md 14.4). Статический для каждого языка — отдаётся мгновенно. */
export default async function HomePage() {
  const { t } = await getI18n();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-5 sm:px-8">
        <span className="inline-flex items-center gap-2.5 text-xl font-bold">
          <span className="bg-primary/15 text-primary inline-flex size-10 items-center justify-center rounded-full">
            <Wallet className="size-5" />
          </span>
          Salary
        </span>
        <nav className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher compact />
          </Suspense>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild variant="ghost">
            <Link href="/login">{t("auth.signIn")}</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-12 text-center sm:px-8 sm:pt-16">
          <p className="bg-primary/12 text-primary mx-auto mb-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold">
            {t("landing.badge")}
          </p>
          <h1 className="mx-auto max-w-3xl text-[40px] leading-[1.1] font-bold tracking-tight sm:text-[56px]">
            {t("landing.title")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg">{t("landing.lead")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                {t("landing.start")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">{t("landing.haveAccount")}</Link>
            </Button>
          </div>
        </section>

        <section
          aria-label={t("landing.previewLabel")}
          className="mx-auto max-w-[1200px] px-4 sm:px-8"
        >
          <div className="glass overflow-hidden rounded-lg p-1.5 sm:p-2">
            <Image
              src="/preview-light.webp"
              alt={t("landing.previewAlt")}
              width={1440}
              height={820}
              priority
              className="block rounded-md dark:hidden"
            />
            <Image
              src="/preview-dark.webp"
              alt={t("landing.previewAltDark")}
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
              <h2 className="text-lg font-semibold">{t(title)}</h2>
              <p className="text-muted-foreground mt-1 text-[15px]">{t(text)}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-8">
          <div className="glass flex flex-col items-center gap-4 rounded-lg px-6 py-10 text-center">
            <h2 className="text-[28px] leading-9 font-bold">{t("landing.ctaTitle")}</h2>
            <p className="text-muted-foreground max-w-lg">{t("landing.ctaText")}</p>
            <Button asChild size="lg">
              <Link href="/register">
                {t("auth.createAccount")} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto max-w-[1200px] px-4 pb-8 text-center text-sm sm:px-8">
        © 2026 Salary
      </footer>
    </div>
  );
}
