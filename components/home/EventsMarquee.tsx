import type { CSSProperties, ReactNode } from "react";

/**
 * Full-bleed rail that scrolls itself, right to left, forever.
 *
 * Two identical groups of cards sit side by side; the track animates by exactly
 * one group's width plus one gap, so the loop is seamless (see the
 * `marquee-scroll` keyframes in globals.css for why the shift isn't a flat
 * -50%). Pure CSS — no client component, no rAF loop, and it keeps working if
 * JS never arrives.
 *
 * The track carries no horizontal padding on purpose: `translate3d(-50%…)`
 * resolves against the border box, so padding there would throw the loop out by
 * that amount every pass. A continuous rail has no edges to inset anyway.
 *
 * The duplicate group is `aria-hidden` and `inert`: screen readers and keyboard
 * users get one copy of each event, not two.
 *
 * Vertical padding on the viewport is not decoration. `overflow-x` clips the
 * cross axis too, so without it the cards' `hover:-translate-y-1` lift and
 * their drop shadows get sliced off — the bug this rail replaces. The top and
 * bottom values differ because the card's shadow does: 4px of lift and a 2px
 * shadow above, against a 40px-tall shadow below.
 */
export default function EventsMarquee({
  children,
  /** Seconds for one full pass. More cards want a longer duration. */
  duration = 60,
}: {
  children: ReactNode;
  duration?: number;
}) {
  return (
    <div
      className="marquee scrollbar-hide relative w-full overflow-x-hidden pb-10 pt-3"
      style={
        {
          "--marquee-gap": "1.25rem",
          "--marquee-duration": `${duration}s`,
        } as CSSProperties
      }
    >
      <div className="marquee-track flex w-max gap-[var(--marquee-gap)]">
        <div className="flex shrink-0 gap-[var(--marquee-gap)]">{children}</div>
        <div aria-hidden inert className="flex shrink-0 gap-[var(--marquee-gap)]">
          {children}
        </div>
      </div>
    </div>
  );
}
