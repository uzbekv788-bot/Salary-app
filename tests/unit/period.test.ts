import { describe, expect, it } from "vitest";
import { eachDay, granularityFor, resolvePeriod, todayIn } from "@/lib/period";

const TODAY = "2026-11-14"; // суббота

describe("resolvePeriod", () => {
  it("по умолчанию — текущий месяц", () => {
    const p = resolvePeriod({}, TODAY);
    expect(p).toMatchObject({
      kind: "month",
      from: "2026-11-01",
      to: "2026-11-30",
      days: 30,
      granularity: "day",
      label: "Ноябрь 2026",
      isCurrent: true,
    });
    // Текущий месяц сравнивается с тем же числом дней прошлого: 1–14 октября
    expect(p.prevFrom).toBe("2026-10-01");
    expect(p.prevTo).toBe("2026-10-14");
    expect(p.prevParams).toEqual({ period: "month", date: "2026-10-01" });
    expect(p.nextParams).toBeNull();
  });

  it("прошлый месяц можно листать вперёд", () => {
    const p = resolvePeriod({ period: "month", date: "2026-02-10" }, TODAY);
    expect(p).toMatchObject({
      from: "2026-02-01",
      to: "2026-02-28",
      days: 28,
      label: "Февраль 2026",
      isCurrent: false,
    });
    expect(p.nextParams).toEqual({ period: "month", date: "2026-03-01" });
    // Завершённый месяц — с полным предыдущим календарным месяцем
    expect(p.prevFrom).toBe("2026-01-01");
    expect(p.prevTo).toBe("2026-01-31");
  });

  it("квартал сравнивается с предыдущим календарным кварталом", () => {
    const p = resolvePeriod({ period: "quarter", date: "2026-05-05" }, TODAY);
    expect(p).toMatchObject({ prevFrom: "2026-01-01", prevTo: "2026-03-31" });
  });

  it("неделя начинается в понедельник", () => {
    const p = resolvePeriod({ period: "week" }, TODAY);
    expect(p).toMatchObject({
      from: "2026-11-09",
      to: "2026-11-15",
      days: 7,
      label: "9–15 нояб. 2026",
    });
  });

  it("квартал группируется по неделям, год — по месяцам", () => {
    expect(resolvePeriod({ period: "quarter" }, TODAY)).toMatchObject({
      from: "2026-10-01",
      to: "2026-12-31",
      granularity: "week",
      label: "IV квартал 2026",
    });
    expect(resolvePeriod({ period: "year" }, TODAY)).toMatchObject({
      from: "2026-01-01",
      to: "2026-12-31",
      granularity: "month",
      label: "2026",
    });
  });

  it("произвольный период и предыдущий такой же длины", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-03-10", to: "2026-03-01" }, TODAY);
    expect(p).toMatchObject({
      kind: "custom",
      from: "2026-03-01",
      to: "2026-03-10",
      days: 10,
      prevFrom: "2026-02-19",
      prevTo: "2026-02-28",
      prevParams: null,
    });
  });

  it("некорректные параметры → текущий месяц", () => {
    expect(resolvePeriod({ period: "custom", from: "мусор" }, TODAY).kind).toBe("month");
    expect(resolvePeriod({ period: "decade", date: "2026-13-45" }, TODAY).from).toBe("2026-11-01");
  });
});

describe("утилиты", () => {
  it("granularityFor", () => {
    expect(granularityFor(31)).toBe("day");
    expect(granularityFor(90)).toBe("week");
    expect(granularityFor(365)).toBe("month");
  });

  it("eachDay включает обе границы", () => {
    expect(eachDay("2026-02-27", "2026-03-02")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("todayIn учитывает часовой пояс пользователя", () => {
    const now = new Date("2026-11-14T22:30:00Z");
    expect(todayIn("Europe/Moscow", now)).toBe("2026-11-15");
    expect(todayIn("America/New_York", now)).toBe("2026-11-14");
  });
});
