import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Временная главная — полноценный лендинг появится на шаге 14.4. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="bg-primary/15 text-primary inline-flex size-14 items-center justify-center rounded-full">
        <Wallet className="size-7" />
      </span>
      <h1 className="text-[40px] leading-[48px] font-bold">Salary</h1>
      <p className="text-muted-foreground">Доходы, расходы и понятная аналитика ваших денег.</p>
      <Button asChild size="lg">
        <Link href="/dev/ui">Открыть UI-витрину</Link>
      </Button>
    </main>
  );
}
