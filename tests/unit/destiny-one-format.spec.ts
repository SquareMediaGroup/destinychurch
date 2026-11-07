import { test, expect } from "@playwright/test";
import { fileMeta, formatBytes, messageSummary } from "../../apps/destiny-one/src/lib/format";

/**
 * Destiny One's one-line summary of a message, used for reply quotes and for
 * the message shown on the Report screen. A message with no text (a poll, an
 * event, a photo) must still say what it is, never a blank or a vague
 * "Attachment" when we know better.
 */

const base = { body: null, content: null, attachment: null, deleted: false };

test.describe("messageSummary", () => {
  test("text is shown as it is", () => {
    expect(messageSummary({ ...base, body: "See you at 7" })).toBe("See you at 7");
  });
  test("a deleted message never shows what it said", () => {
    expect(messageSummary({ ...base, body: "something", deleted: true })).toBe("Message deleted");
  });
  test("polls and events say what they are", () => {
    const poll = { kind: "poll" as const, poll: { id: "p", question: "Who's driving?", options: [], allowMultiple: false, totalVoters: 0, votes: [], myOptionIds: [] } };
    expect(messageSummary({ ...base, content: poll })).toBe("Poll: Who's driving?");
    const event = { kind: "event" as const, event: { seriesKey: "s", slug: "e", name: "Prayer Breakfast", startsAt: "2026-10-03T08:00:00Z", location: null, imageUrl: null, webUrl: "" } };
    expect(messageSummary({ ...base, content: event })).toBe("Event: Prayer Breakfast");
  });
  test("files say whether they're a photo or a PDF, including ones still uploading", () => {
    expect(messageSummary({ ...base, attachment: { id: "a", mimeType: "image/jpeg", sizeBytes: 1, url: null } })).toBe("Photo");
    expect(messageSummary({ ...base, attachment: { id: "a", mimeType: "application/pdf", sizeBytes: 1, url: null } })).toBe("PDF");
    expect(messageSummary({ ...base, localAttachment: { mimeType: "image/png" } })).toBe("Photo");
    expect(messageSummary(base)).toBe("Attachment");
  });
});

/** Sizes on Storage and data, Network usage and file bubbles. */
test.describe("formatBytes", () => {
  test("picks KB, MB or GB", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(300)).toBe("1 KB");
    expect(formatBytes(340 * 1024)).toBe("340 KB");
    expect(formatBytes(1.2 * 1024 * 1024)).toBe("1.2 MB");
    expect(formatBytes(2.5 * 1024 ** 3)).toBe("2.5 GB");
  });
  test("file bubbles keep their kind and size", () => {
    expect(fileMeta("application/pdf", 1.2 * 1024 * 1024)).toBe("PDF · 1.2 MB");
    expect(fileMeta("image/jpeg", null)).toBe("Image");
  });
});
