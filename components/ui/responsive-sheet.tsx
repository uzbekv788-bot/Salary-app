"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/** Модалка на десктопе, bottom-sheet на мобильных (design.md §7.6). */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const desktop = useMediaQuery("(min-width: 768px)", true);
  if (desktop)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={description ? undefined : undefined}>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          <div className="mt-4">{children}</div>
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent aria-describedby={description ? undefined : undefined}>
        <DrawerTitle>{title}</DrawerTitle>
        {description && (
          <DrawerDescription className="text-muted-foreground text-sm">
            {description}
          </DrawerDescription>
        )}
        <div className="mt-2 overflow-y-auto">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
