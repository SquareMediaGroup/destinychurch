import { test, expect } from "@playwright/test";
import { pairAudioForVideo } from "../../lib/sermonPairing";
import type { PodcastEpisode } from "../../lib/podcast";
import type { YTVideo } from "../../lib/youtube";

/**
 * The featured card on /sermons shows the latest YouTube sermon with a toggle
 * to its podcast audio. Those come from two unrelated feeds, so the pairing is
 * a heuristic — these are the cases it has to get right.
 */

function episode(over: Partial<PodcastEpisode> & { id: string }): PodcastEpisode {
  return {
    title: "Untitled",
    speaker: null,
    summary: "",
    audioUrl: `https://example.com/${over.id}.mp3`,
    image: "https://example.com/art.jpg",
    publishedAt: "2026-08-02T10:00:00.000Z",
    durationSeconds: 2400,
    ...over,
  };
}

function video(over: Partial<YTVideo> = {}): YTVideo {
  return {
    id: "vid123",
    title: "Walking In Faith",
    description: "",
    thumbnail: "/api/youtube/thumbnail/vid123",
    publishedAt: "2026-08-02T11:00:00.000Z",
    ...over,
  };
}

test("matches the episode of the same message published the same week", () => {
  const episodes = [
    episode({
      id: "b-new",
      title: "Walking In Faith",
      publishedAt: "2026-08-04T09:00:00.000Z",
    }),
    episode({
      id: "b-old",
      title: "The Weight Of Glory",
      publishedAt: "2026-07-28T09:00:00.000Z",
    }),
  ];

  const pair = pairAudioForVideo(video(), episodes);

  expect(pair.episode?.id).toBe("b-new");
  expect(pair.confident).toBe(true);
});

test("matches through boilerplate and speaker suffixes in the title", () => {
  const episodes = [
    episode({
      id: "b-1",
      title: "Walking In Faith",
      speaker: "Ps John",
      publishedAt: "2026-08-05T09:00:00.000Z",
    }),
  ];

  const pair = pairAudioForVideo(
    video({ title: "Sunday Service | Walking In Faith | Destiny Church Tees Valley" }),
    episodes
  );

  expect(pair.episode?.id).toBe("b-1");
  expect(pair.confident).toBe(true);
});

test("accepts a retitled episode when it lands within a couple of days", () => {
  const episodes = [
    episode({
      id: "b-retitled",
      title: "Part Two Of Our August Series",
      publishedAt: "2026-08-03T09:00:00.000Z",
    }),
  ];

  const pair = pairAudioForVideo(video(), episodes);

  expect(pair.episode?.id).toBe("b-retitled");
  expect(pair.confident).toBe(true);
});

test("falls back to the newest episode when nothing is close", () => {
  const episodes = [
    episode({
      id: "b-newest",
      title: "The Weight Of Glory",
      publishedAt: "2026-06-01T09:00:00.000Z",
    }),
    episode({
      id: "b-older",
      title: "Hope Anchored",
      publishedAt: "2026-05-01T09:00:00.000Z",
    }),
  ];

  const pair = pairAudioForVideo(video(), episodes);

  expect(pair.episode?.id).toBe("b-newest");
  expect(pair.confident).toBe(false);
});

test("prefers the better title match over the nearer date", () => {
  const episodes = [
    episode({
      id: "b-near-but-different",
      title: "Hope Anchored Deeply",
      publishedAt: "2026-08-02T12:00:00.000Z",
    }),
    episode({
      id: "b-right-message",
      title: "Walking In Faith",
      publishedAt: "2026-08-06T09:00:00.000Z",
    }),
  ];

  const pair = pairAudioForVideo(video(), episodes);

  expect(pair.episode?.id).toBe("b-right-message");
});

test("returns the newest episode when there is no video", () => {
  const episodes = [
    episode({ id: "b-newest", publishedAt: "2026-08-04T09:00:00.000Z" }),
    episode({ id: "b-older", publishedAt: "2026-07-28T09:00:00.000Z" }),
  ];

  const pair = pairAudioForVideo(null, episodes);

  expect(pair.episode?.id).toBe("b-newest");
  expect(pair.confident).toBe(false);
});

test("returns nothing when the feed is empty", () => {
  expect(pairAudioForVideo(video(), [])).toEqual({
    episode: null,
    confident: false,
  });
  expect(pairAudioForVideo(null, [])).toEqual({
    episode: null,
    confident: false,
  });
});

test("survives an unparseable publish date", () => {
  const episodes = [episode({ id: "b-bad", publishedAt: "not a date" })];

  const pair = pairAudioForVideo(video(), episodes);

  expect(pair.episode?.id).toBe("b-bad");
  expect(pair.confident).toBe(false);
});
