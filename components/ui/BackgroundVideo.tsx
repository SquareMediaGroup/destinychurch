"use client";

import { useAccessibility } from "@/contexts/AccessibilityContext";

/**
 * A decorative, looping video behind a hero.
 *
 * Three things the hand-rolled copies on /serve and /alpha got wrong:
 *
 *  1. **No reduced-motion path.** A muted loop behind a heading is still
 *     continuous motion with no way to stop it — WCAG 2.2.2 territory, and
 *     genuinely unpleasant for anyone who set the preference. Here the video is
 *     simply not rendered when motion is reduced. Both heroes sit on a solid
 *     brand background under a dark scrim, so the section still reads exactly
 *     as designed; there is no missing-asset hole to paper over, which is why
 *     this is preferable to pausing on the first frame.
 *
 *     It reads the site's own preference rather than the media query directly:
 *     `AccessibilityContext` already mirrors the OS setting when the visitor
 *     has not chosen, so this honours both that and the /accessibility toggle.
 *
 *  2. **`preload="auto"`.** A hero video told to preload in full is megabytes
 *     fetched at top priority, competing with the LCP image on a phone.
 *     `metadata` is enough to start playback.
 *
 *  3. **No poster.** Until the first frame decodes the element paints nothing,
 *     so the hero flashes its background colour. A poster is optional here only
 *     because the existing call sites have no still to use yet — pass one.
 *
 * Decorative by definition: `aria-hidden`, and the caller is responsible for
 * the scrim that keeps the text on top legible.
 */
export default function BackgroundVideo({
  src,
  poster,
  className = "absolute inset-0 h-full w-full object-cover",
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const { reducedMotion } = useAccessibility();

  if (reducedMotion) {
    // Keep the still where we have one; otherwise let the section's own
    // background show through rather than rendering a dead black rectangle.
    return poster ? (
      /* The poster is the video's own still, laid out by the same classes as
         the <video> it stands in for. next/image wants either intrinsic
         dimensions or `fill` plus a positioned parent, and this component does
         not control its parent — so a plain <img> is the honest choice here. */
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" aria-hidden="true" className={className} />
    ) : null;
  }

  return (
    <video
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={className}
    />
  );
}
