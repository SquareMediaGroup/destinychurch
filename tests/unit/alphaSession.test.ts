import { describe, it, expect } from "vitest";
import { getNextAlphaSession } from "@/lib/alphaSession";

// Helper: construct a Date at midnight for a given ISO date string
function d(iso: string) {
  return new Date(iso + "T00:00:00");
}

const START = "2025-01-01"; // Wednesday

describe("getNextAlphaSession — before start", () => {
  it("returns start date with isFirst=true when today is before start", () => {
    const result = getNextAlphaSession(START, "weekly", null, d("2024-12-31"));
    expect(result.isFirst).toBe(true);
    expect(result.isPast).toBe(false);
    expect(result.date.getFullYear()).toBe(2025);
    expect(result.date.getMonth()).toBe(0); // January
    expect(result.date.getDate()).toBe(1);
  });

  it("returns start date with isFirst=true when today equals start", () => {
    const result = getNextAlphaSession(START, "weekly", null, d(START));
    expect(result.isFirst).toBe(true);
    expect(result.isPast).toBe(false);
  });
});

describe("getNextAlphaSession — one_off", () => {
  it("returns start date with isPast=true after the event date", () => {
    const result = getNextAlphaSession(START, "one_off", null, d("2025-06-01"));
    expect(result.date.getDate()).toBe(1);
    expect(result.date.getMonth()).toBe(0);
    expect(result.isPast).toBe(true);
    expect(result.isFirst).toBe(true);
  });
});

describe("getNextAlphaSession — weekly", () => {
  it("returns the next occurrence exactly 7 days after start", () => {
    const result = getNextAlphaSession(START, "weekly", null, d("2025-01-02"));
    const expected = d("2025-01-08");
    expect(result.date.getTime()).toBe(expected.getTime());
    expect(result.isFirst).toBe(false);
    expect(result.isPast).toBe(false);
  });

  it("returns the same next date when 'today' lands on it", () => {
    const result = getNextAlphaSession(START, "weekly", null, d("2025-01-08"));
    expect(result.date.getTime()).toBe(d("2025-01-08").getTime());
  });

  it("advances multiple cycles correctly", () => {
    // 22 days after start → ceil(22/7) = 4 cycles → day 28 (Jan 29)
    const result = getNextAlphaSession(START, "weekly", null, d("2025-01-23"));
    expect(result.date.getTime()).toBe(d("2025-01-29").getTime());
  });

  it("defaults to weekly when frequency is null", () => {
    const withNull = getNextAlphaSession(START, null, null, d("2025-01-02"));
    const withWeekly = getNextAlphaSession(START, "weekly", null, d("2025-01-02"));
    expect(withNull.date.getTime()).toBe(withWeekly.date.getTime());
  });

  it("defaults to weekly when frequency is undefined", () => {
    const withUndef = getNextAlphaSession(START, undefined, null, d("2025-01-02"));
    const withWeekly = getNextAlphaSession(START, "weekly", null, d("2025-01-02"));
    expect(withUndef.date.getTime()).toBe(withWeekly.date.getTime());
  });
});

describe("getNextAlphaSession — fortnightly", () => {
  it("returns next occurrence 14 days after start", () => {
    const result = getNextAlphaSession(START, "fortnightly", null, d("2025-01-02"));
    expect(result.date.getTime()).toBe(d("2025-01-15").getTime());
  });

  it("advances correctly over multiple fortnights", () => {
    // 15 days in → next is 28 days
    const result = getNextAlphaSession(START, "fortnightly", null, d("2025-01-16"));
    expect(result.date.getTime()).toBe(d("2025-01-29").getTime());
  });
});

describe("getNextAlphaSession — monthly", () => {
  it("returns next occurrence in the following month", () => {
    const result = getNextAlphaSession(START, "monthly", null, d("2025-01-02"));
    expect(result.date.getFullYear()).toBe(2025);
    expect(result.date.getMonth()).toBe(1); // February
    expect(result.date.getDate()).toBe(1);
  });

  it("advances multiple months correctly", () => {
    const result = getNextAlphaSession(START, "monthly", null, d("2025-03-15"));
    expect(result.date.getMonth()).toBe(3); // April
    expect(result.date.getDate()).toBe(1);
  });

  it("advances past the current month when today is one day after an occurrence", () => {
    // Feb 1 is an occurrence; the day after (Feb 2) should give March 1
    const result = getNextAlphaSession(START, "monthly", null, d("2025-02-02"));
    expect(result.date.getMonth()).toBe(2); // March
    expect(result.date.getDate()).toBe(1);
  });

  it("returns the occurrence date itself when today matches it", () => {
    // Monthly loop: while (next < today). If today = Feb 1, next reaches Feb 1 and stops.
    const result = getNextAlphaSession(START, "monthly", null, d("2025-02-01"));
    expect(result.date.getMonth()).toBe(1); // February
    expect(result.date.getDate()).toBe(1);
  });
});

describe("getNextAlphaSession — custom interval", () => {
  it("uses the provided custom interval in days", () => {
    const result = getNextAlphaSession(START, "custom", 10, d("2025-01-02"));
    expect(result.date.getTime()).toBe(d("2025-01-11").getTime());
  });

  it("falls back to 7-day interval when customIntervalDays is null", () => {
    const result = getNextAlphaSession(START, "custom", null, d("2025-01-02"));
    expect(result.date.getTime()).toBe(d("2025-01-08").getTime());
  });

  it("falls back to 7-day interval when customIntervalDays is 0", () => {
    const result = getNextAlphaSession(START, "custom", 0, d("2025-01-02"));
    expect(result.date.getTime()).toBe(d("2025-01-08").getTime());
  });

  it("handles a large custom interval", () => {
    const result = getNextAlphaSession(START, "custom", 30, d("2025-01-02"));
    expect(result.date.getTime()).toBe(d("2025-01-31").getTime());
  });
});

describe("getNextAlphaSession — date accepts string input", () => {
  it("parses an ISO date string start date correctly", () => {
    const result = getNextAlphaSession("2025-06-01", "weekly", null, d("2025-06-02"));
    expect(result.date.getTime()).toBe(d("2025-06-08").getTime());
  });
});
