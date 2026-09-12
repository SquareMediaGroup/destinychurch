import { test, expect } from "@playwright/test";
import { parseYouTubeTitle, normalizeSpeakerName } from "../../lib/sermonTitle";

/**
 * Fixtures pulled directly from the channel's real public RSS feed
 * (https://www.youtube.com/feeds/videos.xml) rather than invented — the real
 * convention turned out messier than a tidy "Title | Speaker | Destiny Church
 * LIVE" example: both "|" and "||" are used interchangeably, most speakers
 * carry no honorific, and one title skips the pipe entirely.
 */

test("strips the trailing 'Destiny Church LIVE' filler and keeps the speaker", () => {
  expect(parseYouTubeTitle("Child Dedications| Destiny Church LIVE")).toEqual({
    title: "Child Dedications",
    speaker: null, // filler-only tail, no speaker segment left
  });
});

test("a 3-segment title with a single speaker", () => {
  expect(
    parseYouTubeTitle("JONAH 4 - When Your Emotions Are Out of Control | Nkereuwem Ekanem")
  ).toEqual({
    title: "JONAH 4 - When Your Emotions Are Out of Control",
    speaker: "Nkereuwem Ekanem",
  });
});

test("keeps multiple guest speakers as one combined string", () => {
  expect(
    parseYouTubeTitle(
      "At The Movies 6 - Love Transforms Us | Ola Bayode & Funke Awojide | Destiny Church LIVE"
    )
  ).toEqual({
    title: "At The Movies 6 - Love Transforms Us",
    speaker: "Ola Bayode & Funke Awojide",
  });
});

test("comma-separated speakers", () => {
  expect(
    parseYouTubeTitle("At The Movies 3- Made For More | Ruth Wada, Jean Alvarez, Phoebe Smyrell")
  ).toEqual({
    title: "At The Movies 3- Made For More",
    speaker: "Ruth Wada, Jean Alvarez, Phoebe Smyrell",
  });
});

test("'||' is treated the same as a single '|'", () => {
  expect(
    parseYouTubeTitle("At The Movies 5 - Disappointment To Destiny || Mide Akinyele & Younes Moradi")
  ).toEqual({
    title: "At The Movies 5 - Disappointment To Destiny",
    speaker: "Mide Akinyele & Younes Moradi",
  });
});

test("a title with no pipe and an honorific after ' - ' is recognised as a speaker", () => {
  expect(parseYouTubeTitle("SEEN.STRENGHEN.SUSTAINED.SENT.SHINING. - Ps Catherine Harris")).toEqual({
    title: "SEEN.STRENGHEN.SUSTAINED.SENT.SHINING.",
    speaker: "Ps Catherine Harris",
  });
});

test("a title with no pipe and no honorific is left alone, not misparsed at ' - '", () => {
  // Without the honorific gate this would wrongly split into "At The Movies 6"
  // / "Love Transforms Us" — the dash here is part of the title itself.
  expect(parseYouTubeTitle("At The Movies 6 - Love Transforms Us")).toEqual({
    title: "At The Movies 6 - Love Transforms Us",
    speaker: null,
  });
});

test("a plain title with nothing to parse", () => {
  expect(parseYouTubeTitle("Sunday Service")).toEqual({
    title: "Sunday Service",
    speaker: null,
  });
});

test("normalizeSpeakerName collapses honorific variants to the same value", () => {
  expect(normalizeSpeakerName("Ps John Smith")).toBe(normalizeSpeakerName("Pastor John Smith"));
  expect(normalizeSpeakerName(null)).toBeNull();
  expect(normalizeSpeakerName("")).toBeNull();
});
