import { describe, expect, it } from "vitest";
import {
  describeSchedule,
  dueOccurrences,
  MAX_CATCH_UP,
  monthlyEquivalent,
  occurrence,
  upcomingOccurrences,
} from "@/lib/recurring";

describe("occurrence", () => {
  it("31-е число не съезжает после февраля", () => {
    const dates = [0, 1, 2, 3].map((k) => occurrence("2026-01-31", "MONTHLY", 1, k));
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("високосный год и 29 февраля", () => {
    expect(occurrence("2028-02-29", "YEARLY", 1, 1)).toBe("2029-02-28");
    expect(occurrence("2028-02-29", "YEARLY", 1, 4)).toBe("2032-02-29");
  });
  it("недели и интервал", () => {
    expect(occurrence("2026-11-06", "WEEKLY", 1, 1)).toBe("2026-11-13");
    expect(occurrence("2026-11-06", "WEEKLY", 2, 2)).toBe("2026-12-04");
    expect(occurrence("2026-01-15", "MONTHLY", 3, 2)).toBe("2026-07-15");
  });
});

describe("dueOccurrences", () => {
  const rule = {
    startDate: "2026-08-10",
    frequency: "MONTHLY" as const,
    interval: 1,
    count: 0,
    endDate: null,
  };

  it("досоздаёт пропущенные повторения до сегодня включительно", () => {
    expect(dueOccurrences(rule, "2026-11-10")).toEqual({
      dates: ["2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10"],
      count: 4,
      nextDate: "2026-12-10",
      finished: false,
    });
  });
  it("ничего не делает, если дата ещё не наступила", () => {
    expect(dueOccurrences({ ...rule, count: 4 }, "2026-12-09").dates).toEqual([]);
  });
  it("останавливается на дате окончания", () => {
    const r = dueOccurrences({ ...rule, endDate: "2026-09-30" }, "2026-11-18");
    expect(r).toMatchObject({ dates: ["2026-08-10", "2026-09-10"], finished: true });
  });
  it("не создаёт бесконечно много повторений за раз", () => {
    const r = dueOccurrences(
      { ...rule, startDate: "2000-01-01", frequency: "WEEKLY" },
      "2026-11-18",
    );
    expect(r.dates).toHaveLength(MAX_CATCH_UP);
    expect(r.count).toBe(MAX_CATCH_UP);
  });
});

describe("подписи и сводка", () => {
  it("describeSchedule", () => {
    expect(describeSchedule("2026-11-10", "MONTHLY", 1)).toBe("Каждый месяц, 10-го");
    expect(describeSchedule("2026-01-31", "MONTHLY", 1)).toBe(
      "Каждый месяц, 31-го (или в последний день месяца)",
    );
    expect(describeSchedule("2026-11-13", "WEEKLY", 2)).toBe("Каждые 2 нед., по пятницам");
    expect(describeSchedule("2026-03-01", "YEARLY", 1)).toBe("Каждый год, 1 марта");
  });
  it("monthlyEquivalent", () => {
    expect(monthlyEquivalent(100_000, "MONTHLY", 1)).toBe(100_000);
    expect(monthlyEquivalent(1_200_000, "YEARLY", 1)).toBe(100_000);
    expect(monthlyEquivalent(12_000, "WEEKLY", 1)).toBe(52_000);
    expect(monthlyEquivalent(100_000, "MONTHLY", 2)).toBe(50_000);
  });
});

import { monthlyNeeded } from "@/lib/goals";

describe("monthlyNeeded", () => {
  it("делит остаток на оставшиеся месяцы, включая текущий, и округляет до рубля вверх", () => {
    // 150 000 − 60 000 = 90 000 ₽ за ноябрь…май (7 мес.) → 12 857,14 → 12 858 ₽
    expect(monthlyNeeded(15_000_000, 6_000_000, "2027-05-31", "2026-11-18")).toEqual({
      perMonth: 1_285_800,
      months: 7,
    });
  });
  it("просроченный срок — всё в этом месяце; без срока или достигнута — null", () => {
    expect(monthlyNeeded(100_000, 40_000, "2026-01-01", "2026-11-18")).toEqual({
      perMonth: 60_000,
      months: 1,
    });
    expect(monthlyNeeded(100_000, 40_000, null, "2026-11-18")).toBeNull();
    expect(monthlyNeeded(100_000, 100_000, "2027-01-01", "2026-11-18")).toBeNull();
  });
});

describe("upcomingOccurrences", () => {
  it("недельные повторяются несколько раз, пауза и окончание учитываются", () => {
    const base = { endDate: null, interval: 1 };
    const rules = [
      { id: "gym", active: true, nextDate: "2026-11-20", frequency: "WEEKLY" as const, ...base },
      { id: "rent", active: true, nextDate: "2026-12-01", frequency: "MONTHLY" as const, ...base },
      {
        id: "paused",
        active: false,
        nextDate: "2026-11-19",
        frequency: "MONTHLY" as const,
        ...base,
      },
      {
        id: "ended",
        active: true,
        nextDate: "2026-11-25",
        frequency: "WEEKLY" as const,
        interval: 1,
        endDate: "2026-11-25",
      },
    ];
    expect(upcomingOccurrences(rules, "2026-11-18").map((x) => `${x.rule.id}@${x.date}`)).toEqual([
      "gym@2026-11-20",
      "ended@2026-11-25",
      "gym@2026-11-27",
      "rent@2026-12-01",
    ]);
  });
});
