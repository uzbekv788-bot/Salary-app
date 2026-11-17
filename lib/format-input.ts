/** Автоформатирование поля суммы при вводе: "12500,5" → "12 500,5". */
export function formatAmountInput(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, "").replace(".", ",");
  const [intPart = "", ...rest] = s.split(",");
  const frac = rest.join("").slice(0, 2);
  const int = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  s = rest.length ? `${int || "0"},${frac}` : int;
  return s;
}

/** Минорные единицы → строка для поля ввода: 1250050 → "12 500,5". */
export function minorToInput(minor: number): string {
  const whole = Math.trunc(minor / 100);
  const cents = Math.abs(minor % 100);
  return formatAmountInput(
    cents ? `${whole},${String(cents).padStart(2, "0").replace(/0$/, "")}` : String(whole),
  );
}
