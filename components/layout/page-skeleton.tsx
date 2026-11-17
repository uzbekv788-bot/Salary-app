import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Скелетон контента страницы (tasks.md 5.5): вместо белого экрана при загрузке. */
export function PageSkeleton({ kpis = false }: { kpis?: boolean }) {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Загрузка">
      {kpis && (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="grid gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
      )}
      <Card className="grid gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </Card>
      <Card className="grid gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </Card>
    </div>
  );
}
