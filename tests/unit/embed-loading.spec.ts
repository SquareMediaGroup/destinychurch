import { test, expect } from "@playwright/test";
import {
  EMBED_LOADING_STAGES,
  msUntilNextStage,
  stageIndexAt,
  type LoadingStage,
} from "../../lib/embedLoading";

/**
 * The overlay copy shown over a loading iframe — see lib/embedLoading.ts.
 *
 * The stage timings are the whole point of the feature (nothing changes before
 * 3 seconds; something changes after), so they get pinned here rather than
 * left to a visual check nobody will repeat.
 */

test.describe("embed loading stages", () => {
  test("the first line is plain 'Loading' and holds for a full 3 seconds", () => {
    expect(EMBED_LOADING_STAGES[0]).toMatchObject({ after: 0, text: "Loading" });
    expect(stageIndexAt(0)).toBe(0);
    expect(stageIndexAt(2999)).toBe(0);
  });

  test("the copy changes the moment 3 seconds is up", () => {
    expect(stageIndexAt(3000)).toBe(1);
    expect(EMBED_LOADING_STAGES[1].text).not.toBe(EMBED_LOADING_STAGES[0].text);
  });

  test("stages are ordered, so the walk forward is monotonic", () => {
    const boundaries = EMBED_LOADING_STAGES.map((s) => s.after);
    expect(boundaries).toEqual([...boundaries].sort((a, b) => a - b));
    expect(new Set(boundaries).size).toBe(boundaries.length);
  });

  test("every line is distinct — a repeat would read as frozen", () => {
    const lines = EMBED_LOADING_STAGES.map((s) => s.text);
    expect(new Set(lines).size).toBe(lines.length);
  });

  test("each stage takes over exactly on its boundary", () => {
    EMBED_LOADING_STAGES.forEach((stage, i) => {
      expect(stageIndexAt(stage.after)).toBe(i);
      if (i > 0) expect(stageIndexAt(stage.after - 1)).toBe(i - 1);
    });
  });

  test("a backgrounded tab that wakes up late lands on the right line", () => {
    // Browsers clamp timers in hidden tabs, so the tick can arrive long after
    // it was due. Deriving from elapsed time skips the stages it slept
    // through instead of replaying them one per tick.
    const last = EMBED_LOADING_STAGES.length - 1;
    expect(stageIndexAt(60_000)).toBe(last);
    expect(stageIndexAt(Number.MAX_SAFE_INTEGER)).toBe(last);
  });

  test("the last stage is terminal and offers a way out", () => {
    const last = EMBED_LOADING_STAGES[EMBED_LOADING_STAGES.length - 1];
    expect(msUntilNextStage(last.after)).toBeNull();
    expect(last.offerFallback).toBe(true);
  });

  test("only the last stage offers the fallback", () => {
    const offering = EMBED_LOADING_STAGES.filter((s) => s.offerFallback);
    expect(offering).toHaveLength(1);
    expect(offering[0]).toBe(EMBED_LOADING_STAGES[EMBED_LOADING_STAGES.length - 1]);
  });

  test("the wait to the next stage counts down and never goes negative", () => {
    expect(msUntilNextStage(0)).toBe(EMBED_LOADING_STAGES[1].after);
    expect(msUntilNextStage(2999)).toBe(1);
    expect(msUntilNextStage(3000)).toBe(
      EMBED_LOADING_STAGES[2].after - EMBED_LOADING_STAGES[1].after,
    );
    expect(msUntilNextStage(999_999)).toBeNull();
  });

  test("a single-stage list never schedules a tick", () => {
    const only: LoadingStage[] = [{ after: 0, text: "Loading" }];
    expect(stageIndexAt(0, only)).toBe(0);
    expect(stageIndexAt(50_000, only)).toBe(0);
    expect(msUntilNextStage(0, only)).toBeNull();
  });
});
