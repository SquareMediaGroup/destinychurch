// Where the press-and-hold message menu goes: the reactions bar above the
// message, the message itself, the actions card below. Pure maths, so the
// unit tests can check it for any screen and message size.
//
// The message stays where it was if everything fits. Otherwise the whole
// stack slides (down near the header, up near the composer), and a message
// too tall for the screen is cut to what fits, so the bar and the actions are
// always on screen and never cover the message.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MenuLayoutInput {
  /** The message bubble, in window coordinates. */
  bubble: Rect;
  screen: { w: number; h: number };
  /** Safe area: status bar / notch and home indicator. */
  insets: { top: number; bottom: number };
  /** Mine sit on the right, so the bar and actions line up with the right edge. */
  mine: boolean;
  bar: { w: number; h: number };
  card: { w: number; h: number };
}

export interface MenuLayout {
  bar: { x: number; y: number };
  bubble: { x: number; y: number; h: number; clipped: boolean };
  card: { x: number; y: number };
}

/** Space kept from the screen edges (and the safe area). */
export const EDGE = 8;
/** Between the bar, the message and the card. */
export const GAP = 8;
/** The least of a very tall message that is still shown. */
export const MIN_BUBBLE = 60;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** Left edge of something `w` wide, lined up with the bubble's outer edge and kept on screen. */
function alignX(bubble: Rect, w: number, screenW: number, mine: boolean) {
  const x = mine ? bubble.x + bubble.w - w : bubble.x;
  return clamp(x, EDGE, screenW - EDGE - w);
}

export function menuLayout({ bubble, screen, insets, mine, bar, card }: MenuLayoutInput): MenuLayout {
  const top = insets.top + EDGE;
  const bottom = screen.h - insets.bottom - EDGE;
  const room = bottom - top;

  // Cut a message too tall to fit with the bar and card around it.
  const shownH = Math.min(bubble.h, Math.max(MIN_BUBBLE, room - bar.h - card.h - GAP * 2));
  const stackH = bar.h + GAP + shownH + GAP + card.h;

  // Keep the message where it is when that fits; otherwise slide the stack on screen.
  const stackTop = clamp(bubble.y - bar.h - GAP, top, bottom - stackH);
  const bubbleY = stackTop + bar.h + GAP;

  return {
    bar: { x: alignX(bubble, bar.w, screen.w, mine), y: stackTop },
    bubble: { x: bubble.x, y: bubbleY, h: shownH, clipped: shownH < bubble.h },
    card: { x: alignX(bubble, card.w, screen.w, mine), y: bubbleY + shownH + GAP },
  };
}
