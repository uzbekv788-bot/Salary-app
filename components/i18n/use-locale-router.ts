"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/locale-provider";

/** useRouter с префиксом языка для push/replace по внутренним путям. */
export function useLocaleRouter() {
  const router = useRouter();
  const { href } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string, opts?: Parameters<typeof router.push>[1]) =>
        router.push(href(path), opts),
      replace: (path: string, opts?: Parameters<typeof router.replace>[1]) =>
        router.replace(href(path), opts),
    }),
    [router, href],
  );
}
