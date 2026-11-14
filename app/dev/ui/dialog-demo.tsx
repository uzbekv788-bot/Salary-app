"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Открыть диалог</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Стеклянная модалка</DialogTitle>
        <DialogDescription>
          Так будет выглядеть форма добавления операции на десктопе.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
