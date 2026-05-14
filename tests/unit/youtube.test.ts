import { describe, it, expect } from "vitest";
import { formatDate, formatViews, formatDuration } from "@/lib/youtube";

describe("formatDate", () => {
  it("formats a valid ISO date into en-GB long format", () => {
    const result = formatDate("2025-03-15T10:00:00Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/March/);
    expect(result).toMatch(/2025/);
  });

  it("returns a non-empty string for an invalid date string (toLocaleDateString does not throw)", () => {
    // The function's try/catch does not trigger because toLocaleDateString on an Invalid
    // Date returns the string "Invalid Date" rather than throwing.
    const result = formatDate("not-a-date");
    expect(typeof result).toBe("string");
  });

  it("handles a date-only string without time", () => {
    const result = formatDate("2024-12-25");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/December/);
  });
});

describe("formatViews", () => {
  it("returns empty string for undefined", () => {
    expect(formatViews(undefined)).toBe("");
  });

  it("returns empty string for non-numeric string", () => {
    expect(formatViews("abc")).toBe("");
  });

  it("formats numbers below 1000 as plain count", () => {
    expect(formatViews("999")).toBe("999 views");
  });

  it("formats exactly 1000 as 1K", () => {
    expect(formatViews("1000")).toBe("1K views");
  });

  it("formats thousands with one decimal place", () => {
    expect(formatViews("1500")).toBe("1.5K views");
  });

  it("strips trailing .0 from thousands", () => {
    expect(formatViews("2000")).toBe("2K views");
  });

  it("formats exactly 1 million", () => {
    expect(formatViews("1000000")).toBe("1M views");
  });

  it("formats millions with one decimal place", () => {
    expect(formatViews("1500000")).toBe("1.5M views");
  });

  it("strips trailing .0 from millions", () => {
    expect(formatViews("2000000")).toBe("2M views");
  });

  it("formats zero as plain count", () => {
    expect(formatViews("0")).toBe("0 views");
  });
});

describe("formatDuration", () => {
  it("returns empty string for undefined", () => {
    expect(formatDuration(undefined)).toBe("");
  });

  it("returns empty string for a non-matching string", () => {
    expect(formatDuration("not-iso")).toBe("");
  });

  it("formats minutes and seconds without hours", () => {
    expect(formatDuration("PT4M32S")).toBe("4:32");
  });

  it("pads seconds to two digits", () => {
    expect(formatDuration("PT1M5S")).toBe("1:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration("PT1H2M3S")).toBe("1:02:03");
  });

  it("pads minutes and seconds when hours are present", () => {
    expect(formatDuration("PT2H5M9S")).toBe("2:05:09");
  });

  it("handles missing seconds", () => {
    expect(formatDuration("PT3M")).toBe("3:00");
  });

  it("handles missing minutes", () => {
    expect(formatDuration("PT45S")).toBe("0:45");
  });

  it("handles hours with no minutes or seconds", () => {
    expect(formatDuration("PT1H")).toBe("1:00:00");
  });
});
