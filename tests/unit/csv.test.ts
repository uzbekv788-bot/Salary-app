import { describe, expect, it } from "vitest";
import { guessMapping, mapRow, parseCsvDate, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("пишет BOM, «;» и экранирует кавычки", () => {
    const csv = toCsv([
      {
        date: "2026-11-14",
        type: "EXPENSE",
        amount: 123450,
        category: "Кафе",
        wallet: "Карта",
        note: 'Кофе "латте"; с собой',
      },
    ]);
    expect(csv.startsWith("﻿date;type;amount;category;wallet;note\r\n")).toBe(true);
    expect(csv).toContain('2026-11-14;expense;1234,50;Кафе;Карта;"Кофе ""латте""; с собой"');
  });
});

describe("parseCsvDate", () => {
  it("понимает разные форматы", () => {
    expect(parseCsvDate("2026-11-14")).toBe("2026-11-14");
    expect(parseCsvDate("14.11.2026")).toBe("2026-11-14");
    expect(parseCsvDate("14/11/26")).toBe("2026-11-14");
    expect(parseCsvDate("14.11.2026 13:45")).toBe("2026-11-14");
    expect(parseCsvDate("31.02.2026")).toBeNull();
    expect(parseCsvDate("вчера")).toBeNull();
  });
});

describe("mapRow", () => {
  const map = { date: "Дата", amount: "Сумма", note: "Описание" };
  it("отрицательная сумма в выписке — расход", () => {
    expect(mapRow({ Дата: "14.11.2026", Сумма: "-1 234,50", Описание: "Пятёрочка" }, map)).toEqual({
      ok: true,
      row: {
        date: "2026-11-14",
        type: "EXPENSE",
        amount: 123450,
        category: null,
        note: "Пятёрочка",
      },
    });
  });
  it("плюс в сумме — доход", () => {
    const r = mapRow({ Дата: "10.11.2026", Сумма: "+80 000", Описание: "Зарплата" }, map);
    expect(r.ok && r.row.type).toBe("INCOME");
  });
  it("колонка типа важнее знака (наш экспорт)", () => {
    const r = mapRow(
      { date: "2026-11-10", type: "income", amount: "80000,00", category: "Зарплата" },
      { date: "date", amount: "amount", type: "type", category: "category" },
    );
    expect(r).toEqual({
      ok: true,
      row: {
        date: "2026-11-10",
        type: "INCOME",
        amount: 8_000_000,
        category: "Зарплата",
        note: null,
      },
    });
  });
  it("сообщает об ошибках", () => {
    expect(mapRow({ Дата: "??", Сумма: "1" }, map).ok).toBe(false);
    expect(mapRow({ Дата: "14.11.2026", Сумма: "abc" }, map).ok).toBe(false);
  });
});

describe("guessMapping", () => {
  it("узнаёт наш экспорт и выписку банка", () => {
    expect(guessMapping(["date", "type", "amount", "category", "wallet", "note"])).toMatchObject({
      date: "date",
      amount: "amount",
      type: "type",
      category: "category",
      note: "note",
    });
    expect(guessMapping(["Дата операции", "Сумма операции", "Описание"])).toMatchObject({
      date: "Дата операции",
      amount: "Сумма операции",
      note: "Описание",
    });
  });
});
