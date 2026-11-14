# Real Motion: motion reference

## The curve

`EASE = Easing.bezier(0.86, 0, 0.07, 1)`: about the most aggressive ease-in-out there is. The
first quarter barely moves, the middle half covers almost all the distance, and the last quarter
settles. On screen, things seem to decide to move, travel instantly, then land softly. That
decisiveness is the style.

`kf(frame, input, output)` applies it between every pair of keyframes, so
`kf(f, [0, 20, 80, 100], [0, 1, 1, 0])` is two separate eased moves with a dead-still hold
between them. Always clamp (kf does). Keyframes must strictly increase.

`EASE_SOFT = bezier(0.45, 0, 0.2, 1)` is only for camera moves that run under other motion
(walkthrough pans and zooms), where the aggressive curve would feel jumpy.

## Durations (at 30 fps)

| Move | Frames | Notes |
| --- | --- | --- |
| Word reveal | 32 per word, 4 apart | Masked: each word slides up 110% from behind its own clip. |
| Kicker / label | 28 | Fade + 24 px rise. |
| Body copy | 30, starting ~24 after the headline | Fade + 26 px rise. |
| Device rise | 46 | From 700 to 900 px below. The biggest move in a scene. |
| Enter (cards, chips) | 30, staggered 6 to 8 | Fade + 40 px. |
| Punch-in | 36 in, hold 40 to 80, 36 out | Zoom 1.6 to 2.2x on the point of interest. |
| Scene exit | last 22 | Lift 90 px + fade. Exits are faster than entrances. |
| Crossfade between scenes | 8 | Short, because each scene already exits on its own. |
| Count-up | 45 | Numbers use tabular figures so they don't jitter. |
| Typing | about 22 characters a second | Caret blinks every 15 frames once done. |
| Cursor travel | 24 | Click at arrival: press scale 0.86, ripple over 16 frames. |

## Choreography

- **One thing leads.** In each beat one element moves; everything else holds. Stagger, don't
  stack.
- **Order:** kicker → headline → body → device. The device arrives last and biggest.
- **Hold.** After a scene's elements land, hold at least 1 to 1.5 s before the exit, longer for a
  long headline (0.3 s a word).
- **Direction.** Things enter from below and leave upwards, so the film keeps a forward pull. Side
  entrances are for "next" items in a row.
- **Punch-ins guide the eye.** Zoom to where the benefit is (the result, the number, the button),
  and fade the copy beside the device by `1 - usePunch(at, hold)` so the zoom never covers text.
- **Camera, not cuts.** Inside a scene, a punch-in or a scroll (`scroll` on the frames) does what a
  cut would, and keeps the viewer oriented.
- **The end holds.** The last scene (the CTA) has no exit: it lands and stays still.

## Don't

- Springs, bounces, elastic or overshoot: they read as cheap next to the house ease.
- Linear motion (except a progress bar and typing).
- Moving everything at once, or keeping things drifting during a hold.
- Long dissolves, wipes, spins, 3D flips, glitch effects.
- Motion blur on UI: screenshots must stay crisp to be readable.

## Type and colour

- **Headlines:** 90 to 150 px, weight 700, letter-spacing -0.035em, line-height 1.05. One accent
  word at most per line.
- **Kickers:** 28 to 32 px, uppercase, letter-spacing 0.2em, the accent colour.
- **Body:** 34 to 42 px, the muted colour, max about 1300 px wide.
- **Colour:** light page (#F5F5F7-ish), white cards, near-black ink and one accent. A single dark
  scene (the CTA) for contrast is fine.
- Never put text on top of a busy screenshot. Put it beside the device, or above it.
