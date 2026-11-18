import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { LOCALES, localePath } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

/** Для каждого языка заранее собирается своя статическая оболочка (Cache Components) */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    applicationName: "Salary",
    appleWebApp: { capable: true, title: "Salary", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    title: { default: t("meta.title"), template: "%s · Salary" },
    description: t("meta.description"),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])) },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdf4" },
    { media: "(prefers-color-scheme: dark)", color: "#05110d" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <LocaleProvider locale={locale} dict={dictionaries[locale]}>
          <ThemeProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
