"use client";

import { Toaster as Sonner } from "sonner";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/** Тосты (design.md §7.8): справа внизу на десктопе, сверху на мобильном — чтобы не перекрывать таббар и кнопку «+». */
export function Toaster() {
  const desktop = useMediaQuery("(min-width: 768px)", true);
  return (
    <Sonner
      position={desktop ? "bottom-right" : "top-center"}
      toastOptions={{ className: "glass-strong !rounded-md" }}
    />
  );
}
