import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="focus-visible:ring-ring mb-8 inline-flex items-center gap-2.5 rounded-full text-xl font-bold outline-none focus-visible:ring-2"
      >
        <span className="bg-primary/15 text-primary inline-flex size-10 items-center justify-center rounded-full">
          <Wallet className="size-5" />
        </span>
        Salary
      </Link>
      <div className="glass w-full max-w-[420px] animate-[rise-in_250ms_var(--ease-out-soft)] rounded-lg p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
