import { describe, it, expect } from "vitest";
import { getEventBySlug, formatEventDate, events } from "@/content/events";

describe("getEventBySlug", () => {
  it("returns the matching event for a known slug", () => {
    const event = getEventBySlug("sunday-gathering");
    expect(event).toBeDefined();
    expect(event!.slug).toBe("sunday-gathering");
    expect(event!.title).toBe("Sunday Gathering");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getEventBySlug("nonexistent-event")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getEventBySlug("")).toBeUndefined();
  });

  it("returns the correct event for each slug in the events array", () => {
    for (const event of events) {
      const found = getEventBySlug(event.slug);
      expect(found).toBe(event);
    }
  });
});

describe("formatEventDate", () => {
  it("includes the day of week abbreviation", () => {
    // 2025-02-23 is a Sunday
    const result = formatEventDate("2025-02-23");
    expect(result).toMatch(/Sun/i);
  });

  it("includes the numeric day", () => {
    const result = formatEventDate("2025-03-05");
    expect(result).toMatch(/5/);
  });

  it("includes the month abbreviation", () => {
    const result = formatEventDate("2025-03-05");
    expect(result).toMatch(/Mar/i);
  });

  it("returns a non-empty string for any event date", () => {
    for (const event of events) {
      expect(formatEventDate(event.date).length).toBeGreaterThan(0);
    }
  });
});
