"use client";

import * as React from "react";
import { DropdownMenu as DM } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DM.Root;
const DropdownMenuTrigger = DM.Trigger;

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={sideOffset}
        className={cn(
          "glass-strong z-50 min-w-44 rounded-md p-1.5 data-[state=open]:animate-[fade-in_150ms_ease-out]",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

const itemClass =
  "relative flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-[15px] outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-foreground/6 [&_svg]:size-4 [&_svg]:text-muted-foreground";

function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return <DM.Item className={cn(itemClass, className)} {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem className={cn(itemClass, "pr-9", className)} {...props}>
      {children}
      <DM.ItemIndicator className="absolute right-3">
        <Check className="!text-primary" />
      </DM.ItemIndicator>
    </DM.RadioItem>
  );
}

const DropdownMenuRadioGroup = DM.RadioGroup;

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn("bg-foreground/8 my-1 h-px", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
};
