"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";

/** Переключатели страницы аналитики, состояние в URL. */
export function UrlSegmented({
  param,
  options,
  label,
  fallback,
}: {
  param: string;
  options: { value: string; label: string; activeClass?: string }[];
  label: string;
  fallback: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <Segmented
      label={label}
      className="w-auto"
      value={sp.get(param) ?? fallback}
      onChange={(v) => {
        const next = new URLSearchParams(sp);
        if (v === fallback) next.delete(param);
        else next.set(param, v);
        router.replace(`${pathname}?${next}`, { scroll: false });
      }}
      options={options}
    />
  );
}
