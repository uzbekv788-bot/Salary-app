import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-lg">
        <EmptyState
          icon={Compass}
          title="Страница не найдена"
          description="Возможно, ссылка устарела или в ней опечатка."
          action={
            <Button asChild>
              <Link href="/dashboard">На главную</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
