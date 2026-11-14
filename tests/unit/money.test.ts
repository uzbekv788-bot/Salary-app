import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatMoney,
  formatPercent,
  parseAmount,
  percentChange,
  savingsRate,
} from "@/lib/money";

// Intl использует неразрывные пробелы — нормализуем для читаемых ожиданий
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("parseAmount", () => {
  it("разбирает целые и дробные суммы", () => {
    expect(parseAmount("12500")).toBe(1_250_000);
    expect(parseAmount("12 500,5")).toBe(1_250_050);
    expect(parseAmount("12500.05")).toBe(1_250_005);
    expect(parseAmount("0,1")).toBe(10);
    expect(parseAmount("-300")).toBe(-30_000);
  });

  it("не теряет копейки на классическом 0.1 + 0.2", () => {
    expect(parseAmount("0.1")! + parseAmount("0.2")!).toBe(parseAmount("0.3"));
    expect(parseAmount(0.1 + 0.2)).toBe(30);
  });

  it("отклоняет мусор и лишние знаки после запятой", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("12,5,0")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("форматирует рубли по-русски", () => {
    expect(n(formatMoney(12_435_000))).toBe("124 350 ₽");
    expect(n(formatMoney(1_250_050))).toBe("12 500,50 ₽");
    expect(n(formatMoney(1_250_000, "RUB", { cents: true }))).toBe("12 500,00 ₽");
  });

  it("использует настоящий минус и плюс для доходов", () => {
    expect(n(formatMoney(-345_000))).toBe("−3 450 ₽");
    expect(n(formatMoney(1_200_000, "RUB", { signed: true }))).toBe("+12 000 ₽");
    expect(n(formatMoney(0, "RUB", { signed: true }))).toBe("0 ₽");
  });

  it("поддерживает другие валюты", () => {
    expect(n(formatMoney(150_000, "USD"))).toBe("1 500 $");
  });
});

describe("formatCompact", () => {
  it("сокращает большие числа для осей", () => {
    expect(n(formatCompact(12_000_000))).toBe("120 тыс.");
    expect(n(formatCompact(125_000_000))).toBe("1,3 млн");
  });
});

describe("аналитика", () => {
  it("percentChange", () => {
    expect(percentChange(112, 100)).toBeCloseTo(0.12);
    expect(percentChange(50, 100)).toBeCloseTo(-0.5);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("savingsRate", () => {
    expect(savingsRate(185_000, 60_650)).toBeCloseTo(0.672, 3);
    expect(savingsRate(0, 100)).toBeNull();
    expect(savingsRate(100, 150)).toBeCloseTo(-0.5);
  });

  it("formatPercent", () => {
    expect(n(formatPercent(0.12, { signed: true }))).toBe("+12 %");
    expect(n(formatPercent(-0.034))).toBe("−3,4 %");
  });
});
