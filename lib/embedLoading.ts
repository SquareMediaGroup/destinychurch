/**
 * The copy an embed shows while it loads.
 *
 * A ChurchSuite form or a YouTube player is a cross-origin iframe: we hand the
 * browser a URL and get exactly one signal back, `onLoad`. There is no progress
 * to report, so the overlay can only ever say "not yet". The failure mode is
 * that a single static "Loading" sitting there for eight seconds reads as
 * *broken* rather than slow, and the visitor closes the modal — on pages like
 * /give and /connect that is the whole conversion.
 *
 * So the line changes as time passes. Movement is the signal that something is
 * still happening; the reassurance is what buys the extra few seconds.
 *
 * Every line here is true at the moment it appears — it is still loading, it
 * has been longer than usual, they have been waiting. Deliberately absent:
 * invented machinery ("Connecting to secure server", "Encrypting your
 * details"). Those read as more convincing precisely because they claim things
 * the site is not doing, and half these embeds are the giving form. Being
 * caught inventing a security step on a donation page costs more than the
 * bounce it saves. Movement does the psychological work on its own.
 */
export interface LoadingStage {
  /** Milliseconds after loading starts at which this line takes over. */
  after: number;
  text: string;
  /**
   * Show the "open in a new tab" escape hatch alongside the text. Only set on
   * the last stage: by then the odds are the iframe is blocked rather than
   * slow, and a working way out beats a nicer spinner.
   */
  offerFallback?: boolean;
}

/** Ordered by `after`, ascending. `stageIndexAt` relies on that. */
export const EMBED_LOADING_STAGES: readonly LoadingStage[] = [
  { after: 0, text: "Loading" },
  // 3s is where a wait stops reading as page-load and starts reading as stuck.
  { after: 3000, text: "Still loading" },
  { after: 8000, text: "Taking longer than usual" },
  { after: 14000, text: "Thanks for waiting", offerFallback: true },
] as const;

/**
 * The stage showing at `elapsed` ms — the last one whose `after` has passed.
 *
 * Derived from elapsed time rather than counted up one timer at a time, so a
 * backgrounded tab (where browsers clamp timers to once a minute) resumes on
 * the right line instead of walking through the ones it slept through.
 */
export function stageIndexAt(
  elapsed: number,
  stages: readonly LoadingStage[] = EMBED_LOADING_STAGES,
): number {
  let index = 0;
  for (let i = 1; i < stages.length; i++) {
    if (elapsed < stages[i].after) break;
    index = i;
  }
  return index;
}

/**
 * Milliseconds until the next stage takes over, or `null` on the last one.
 *
 * Never negative: a caller waking up late gets 0 and advances immediately.
 */
export function msUntilNextStage(
  elapsed: number,
  stages: readonly LoadingStage[] = EMBED_LOADING_STAGES,
): number | null {
  const next = stages[stageIndexAt(elapsed, stages) + 1];
  return next ? Math.max(0, next.after - elapsed) : null;
}
