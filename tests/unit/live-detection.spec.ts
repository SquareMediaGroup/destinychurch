import { test, expect } from "@playwright/test";
import { parseLivePage } from "../../lib/youtube";

/**
 * Livestream detection — what a YouTube /live page has to look like for the
 * site to declare us on air.
 *
 * The page previously matched `"isLiveNow":(true|false)` anywhere in the HTML.
 * YouTube emits `ytInitialData` — recommendation shelves, each with its own
 * `isLiveNow` — *before* `ytInitialPlayerResponse`, so the first match was
 * routinely some unrelated video's flag. A real broadcast could be scored
 * offline, which is exactly the failure this suite pins down.
 */

/** Minimal stand-in for the shelf JSON YouTube emits ahead of the player blob. */
function shelvesBefore(...flags: boolean[]): string {
  const items = flags.map((f) => `{"compactVideoRenderer":{"isLiveNow":${f}}}`).join(",");
  return `<script>var ytInitialData = {"contents":{"results":[${items}]}};</script>`;
}

function playerResponse(body: Record<string, unknown>): string {
  return `<script>var ytInitialPlayerResponse = ${JSON.stringify(body)};</script>`;
}

function watchPage(videoId: string, body: Record<string, unknown>, shelves = ""): string {
  return [
    "<html><head>",
    `<link rel="canonical" href="https://www.youtube.com/watch?v=${videoId}">`,
    '<meta name="title" content="Sunday Service">',
    "</head><body>",
    shelves,
    playerResponse(body),
    "</body></html>",
  ].join("");
}

test("a live broadcast is detected even when shelves claim otherwise first", () => {
  const html = watchPage(
    "abcdefghijk",
    {
      videoDetails: { videoId: "abcdefghijk", title: "Sunday Live", isLive: true, isLiveContent: true },
      microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: true, startTimestamp: "2026-08-09T10:02:00Z" } } },
    },
    // Three recommendations that are not live — the old regex read one of these.
    shelvesBefore(false, false, false)
  );

  const verdict = parseLivePage(html);
  expect(verdict.kind).toBe("live");
  if (verdict.kind !== "live") return;
  expect(verdict.videoId).toBe("abcdefghijk");
  expect(verdict.title).toBe("Sunday Live");
  expect(verdict.startedAt).toBe("2026-08-09T10:02:00Z");
});

test("isLiveNow alone is enough when videoDetails omits isLive", () => {
  const html = watchPage("bbbbbbbbbbb", {
    videoDetails: { videoId: "bbbbbbbbbbb", title: "Sunday Live", isLiveContent: true },
    microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: true } } },
  });
  expect(parseLivePage(html).kind).toBe("live");
});

test("a finished broadcast is offline, not live", () => {
  const html = watchPage(
    "ccccccccccc",
    {
      videoDetails: { videoId: "ccccccccccc", title: "Last Sunday", isLive: false, isLiveContent: true },
      microformat: {
        playerMicroformatRenderer: {
          liveBroadcastDetails: {
            isLiveNow: false,
            startTimestamp: "2026-08-02T10:00:00Z",
            endTimestamp: "2026-08-02T11:30:00Z",
          },
        },
      },
    },
    // …and a recommendation that *is* live, which must not leak through.
    shelvesBefore(true)
  );
  expect(parseLivePage(html).kind).toBe("offline");
});

test("a scheduled broadcast reports as upcoming with its start time", () => {
  const scheduled = Math.floor(Date.UTC(2026, 7, 16, 10, 0, 0) / 1000);
  const html = watchPage("ddddddddddd", {
    videoDetails: { videoId: "ddddddddddd", title: "Next Sunday", isUpcoming: true, isLiveContent: true },
    playabilityStatus: {
      liveStreamability: {
        liveStreamabilityRenderer: {
          offlineSlate: { liveStreamOfflineSlateRenderer: { scheduledStartTime: String(scheduled) } },
        },
      },
    },
  });

  const verdict = parseLivePage(html);
  expect(verdict.kind).toBe("upcoming");
  if (verdict.kind !== "upcoming") return;
  expect(verdict.scheduledFor).toBe("2026-08-16T10:00:00.000Z");
});

test("a redirect to the channel home is a definitive offline, not a failure", () => {
  const html = [
    "<html><head>",
    '<link rel="canonical" href="https://www.youtube.com/@DestinyOnlineChurch">',
    "</head><body>",
    shelvesBefore(false, false),
    "</body></html>",
  ].join("");
  // Must not be "unknown": that would escalate to a quota-costing API call
  // every minute of every day we aren't streaming.
  expect(parseLivePage(html).kind).toBe("offline");
});

test("a consent wall is unknown so detection escalates instead of guessing", () => {
  const html =
    "<html><head><title>Before you continue to YouTube</title></head><body>consent</body></html>";
  expect(parseLivePage(html).kind).toBe("unknown");
});

test("a video id with no readable liveness is a candidate for API confirmation", () => {
  const html = [
    "<html><head>",
    '<link rel="canonical" href="https://www.youtube.com/watch?v=eeeeeeeeeee">',
    "</head><body></body></html>",
  ].join("");

  const verdict = parseLivePage(html);
  expect(verdict.kind).toBe("candidate");
  if (verdict.kind !== "candidate") return;
  expect(verdict.videoId).toBe("eeeeeeeeeee");
});

test("braces inside JSON strings don't truncate the player blob", () => {
  const html = watchPage("fffffffffff", {
    videoDetails: {
      videoId: "fffffffffff",
      // Every shape that naive brace counting trips over: braces, an escaped
      // quote, and a trailing backslash.
      title: 'Faith {and} "hope" \\',
      isLive: true,
    },
  });

  const verdict = parseLivePage(html);
  expect(verdict.kind).toBe("live");
  if (verdict.kind !== "live") return;
  expect(verdict.title).toBe('Faith {and} "hope" \\');
});
