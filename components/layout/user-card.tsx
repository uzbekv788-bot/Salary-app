import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/layout/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** Низ сайдбара: тема + пользователь. Читает сессию — рендерить внутри <Suspense>. */
export async function UserCard({ variant }: { variant: "sidebar" | "sheet" }) {
  const user = await requireUser({ allowNotOnboarded: true });
  const avatar = (
    <span
      className="bg-primary/15 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      aria-hidden
    >
      {initials(user.name)}
    </span>
  );

  if (variant === "sheet")
    return (
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-muted-foreground truncate text-[13px]">{user.email}</p>
        </div>
        <ThemeToggle />
        <SignOutButton userId={user.id} />
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-3 lg:items-stretch">
      <ThemeToggle className="hidden lg:inline-flex lg:self-start" />
      <div className="flex items-center gap-2.5">
        <span title={user.name}>{avatar}</span>
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-muted-foreground truncate text-[13px]">{user.email}</p>
        </div>
        <span className="hidden lg:inline-flex">
          <SignOutButton userId={user.id} />
        </span>
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <Skeleton className="size-9 rounded-full" />
      <div className="hidden flex-1 gap-1.5 lg:grid">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
