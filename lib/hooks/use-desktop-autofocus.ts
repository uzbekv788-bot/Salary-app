"use client";

import { useEffect, useRef } from "react";

/**
 * Автофокус только на устройствах с мышью: на телефоне фокус внутри bottom-sheet
 * открывает клавиатуру поверх формы и сдвигает фиксированный слой.
 */
export function useDesktopAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);
  return ref;
}
