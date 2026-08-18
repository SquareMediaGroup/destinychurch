import { test, expect } from "@playwright/test";
import {
  EMPTY_SIMULATED_LIVE,
  formatTimecode,
  isSimulatedLiveReady,
  parseIsoDurationSeconds,
  parseYouTubeId,
  simulatedEndsAt,
  simulatedPhase,
  simulatedPosition,
  type SimulatedLiveConfig,
} from "../../lib/simulatedLive";

/**
 * Simulated live is arithmetic pretending to be a broadcast: everything a
 * viewer sees comes from `now - startsAt`. These pin the two things that would
 * be invisible in testing and obvious on a Sunday morning — where the playhead
 * lands, and when the page goes off air — plus the link parsing, which is the
 * one place an admin can silently get it wrong.
 */

const START = "2026-08-18T10:00:00.000Z";
const at = (iso: string) => Date.parse(iso);

const service: SimulatedLiveConfig = {
  active: true,
  videoId: "dQw4w9WgXcQ",
  title: "Sunday Service",
  startsAt: START,
  durationSeconds: 3600,
  notice: null,
};

/* ── Phase ───────────────────────────────────────────────────────────────── */

test("before the start time it is scheduled, not airing", () => {
  expect(simulatedPhase(service, at("2026-08-18T09:59:59.000Z"))).toBe("scheduled");
});

test("it airs from the start time to the end of the video", () => {
  expect(simulatedPhase(service, at(START))).toBe("airing");
  expect(simulatedPhase(service, at("2026-08-18T10:59:59.000Z"))).toBe("airing");
});

test("the instant the runtime elapses it is finished", () => {
  // Exactly on the boundary, because "one second past the end" is the easy
  // case and off-by-one here means a black player at the end of the service.
  expect(simulatedPhase(service, at("2026-08-18T11:00:00.000Z"))).toBe("finished");
});

test("switched off is off, whatever the clock says", () => {
  expect(simulatedPhase({ ...service, active: false }, at("2026-08-18T10:30:00.000Z"))).toBe(
    "off"
  );
});

test("a half-filled row can be saved but never goes on air", () => {
  expect(simulatedPhase({ ...service, durationSeconds: null }, at(START))).toBe("off");
  expect(simulatedPhase({ ...service, startsAt: null }, at(START))).toBe("off");
  expect(simulatedPhase({ ...service, videoId: null }, at(START))).toBe("off");
  expect(simulatedPhase(EMPTY_SIMULATED_LIVE, at(START))).toBe("off");
  expect(isSimulatedLiveReady(EMPTY_SIMULATED_LIVE)).toBe(false);
});

test("an unparseable start time is treated as not ready, not as 1970", () => {
  expect(simulatedPhase({ ...service, startsAt: "whenever" }, at(START))).toBe("off");
});

/* ── Position ────────────────────────────────────────────────────────────── */

test("joining late drops you in exactly that far in", () => {
  // The whole feature in one assertion: twenty minutes after the start, a
  // viewer opening the page is twenty minutes into the video.
  expect(simulatedPosition(service, at("2026-08-18T10:20:00.000Z"))).toBe(1200);
});

test("the position is clamped to the video, never past either end", () => {
  expect(simulatedPosition(service, at("2026-08-18T09:00:00.000Z"))).toBe(0);
  expect(simulatedPosition(service, at("2026-08-18T23:00:00.000Z"))).toBe(3600);
});

test("ends exactly one runtime after the start", () => {
  expect(simulatedEndsAt(service)).toBe("2026-08-18T11:00:00.000Z");
  expect(simulatedEndsAt(EMPTY_SIMULATED_LIVE)).toBeNull();
});

/* ── YouTube links ───────────────────────────────────────────────────────── */

test("every shape of link an admin might paste resolves to the same id", () => {
  const forms = [
    "dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc123",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ",
  ];
  for (const form of forms) {
    expect(parseYouTubeId(form), form).toBe("dQw4w9WgXcQ");
  }
});

test("a channel link is not a video, however many characters it has", () => {
  // The near miss that a loose regex would happily match eleven characters of.
  expect(parseYouTubeId("https://www.youtube.com/@DestinyOnlineChurch")).toBeNull();
  expect(parseYouTubeId("https://www.youtube.com/destinychurchteesvalley")).toBeNull();
  expect(parseYouTubeId("https://www.youtube.com/@DestinyOnlineChurch/live")).toBeNull();
});

test("non-YouTube and nonsense input come back null", () => {
  expect(parseYouTubeId("https://vimeo.com/dQw4w9WgXcQ")).toBeNull();
  expect(parseYouTubeId("not a link")).toBeNull();
  expect(parseYouTubeId("")).toBeNull();
  expect(parseYouTubeId("dQw4w9WgXc")).toBeNull(); // ten characters
});

/* ── Durations ───────────────────────────────────────────────────────────── */

test("ISO durations become the seconds the end time is computed from", () => {
  expect(parseIsoDurationSeconds("PT1H2M10S")).toBe(3730);
  expect(parseIsoDurationSeconds("PT45M")).toBe(2700);
  expect(parseIsoDurationSeconds("PT90S")).toBe(90);
  expect(parseIsoDurationSeconds("P1DT2H")).toBe(93600);
});

test("a duration that isn't one is null rather than zero", () => {
  // Zero would read as a valid runtime and take the broadcast off air instantly.
  expect(parseIsoDurationSeconds("P0D")).toBeNull();
  expect(parseIsoDurationSeconds("PT0S")).toBeNull();
  expect(parseIsoDurationSeconds("banana")).toBeNull();
  expect(parseIsoDurationSeconds(undefined)).toBeNull();
});

test("timecodes drop the hour only when there isn't one", () => {
  expect(formatTimecode(3730)).toBe("1:02:10");
  expect(formatTimecode(247)).toBe("4:07");
  expect(formatTimecode(0)).toBe("0:00");
  expect(formatTimecode(-5)).toBe("0:00");
});
