import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
import { UserCard, UserCardSkeleton } from "@/components/layout/user-card";
import { AddTransactionProvider } from "@/components/transactions/add-transaction-provider";
import { AddTransactionLoader } from "@/components/transactions/add-transaction-loader";

/**
 * Каркас приложения (tasks.md 5.1). Оболочка (меню, отступы) статическая и показывается
 * мгновенно; всё, что читает сессию, — внутри <Suspense> (Cache Components).
 * Неавторизованных отсекает proxy.ts, окончательно — requireUser() в каждой странице.
 */
export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <AddTransactionProvider>
      <Sidebar
        footer={
          <Suspense fallback={<UserCardSkeleton />}>
            <UserCard variant="sidebar" />
          </Suspense>
        }
      />
      <TabBar
        footer={
          <Suspense fallback={<UserCardSkeleton />}>
            <UserCard variant="sheet" />
          </Suspense>
        }
      />
      <main className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-28 sm:px-8 md:pb-10 md:pl-[128px] lg:pl-[312px] xl:max-w-[1600px]">
        {children}
      </main>
      <Suspense fallback={null}>
        <AddTransactionLoader />
      </Suspense>
    </AddTransactionProvider>
  );
}
