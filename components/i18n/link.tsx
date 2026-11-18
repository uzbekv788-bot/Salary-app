"use client";

import NextLink from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";

/** next/link, который сам добавляет префикс языка: href="/dashboard" → /en/dashboard. */
export default function Link({ href, ...props }: React.ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  return <NextLink href={typeof href === "string" ? localize(href) : href} {...props} />;
}
