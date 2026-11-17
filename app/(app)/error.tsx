"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="Не удалось загрузить страницу"
        description="Мы уже знаем о проблеме. Попробуйте ещё раз через пару секунд."
        action={<Button onClick={reset}>Повторить</Button>}
      />
    </Card>
  );
}
