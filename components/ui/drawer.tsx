"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

/** Bottom-sheet для мобильных (design.md §7.6): ручка сверху, закрытие свайпом вниз. */
const Drawer = DrawerPrimitive.Root;
const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerClose = DrawerPrimitive.Close;

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[4px]" />
      <DrawerPrimitive.Content
        className={cn(
          "glass-strong fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[92dvh] flex-col rounded-t-lg px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] outline-none",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className="bg-foreground/15 mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full"
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn("mb-3 text-lg leading-[26px] font-semibold", className)}
      {...props}
    />
  );
}

const DrawerDescription = DrawerPrimitive.Description;

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerTitle, DrawerDescription };
