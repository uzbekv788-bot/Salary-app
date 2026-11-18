import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  applicationName: "Salary",
  appleWebApp: { capable: true, title: "Salary", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  title: { default: "Salary — финансовый аналитик", template: "%s · Salary" },
  description: "Доходы, расходы по категориям и наглядная аналитика ваших денег.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdf4" },
    { media: "(prefers-color-scheme: dark)", color: "#05110d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
