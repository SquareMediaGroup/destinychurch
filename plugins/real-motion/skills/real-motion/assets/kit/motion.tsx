// Real Motion: the motion primitives. Everything moves through kf(), so every move shares the house
// ease (theme.ts EASE): a beat of stillness, a fast decisive travel, a long soft landing.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, F } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Keyframes with the house ease between every pair: kf(frame, [0, 20, 80, 100], [0, 1, 1, 0]).
 * Each segment eases in and out on its own, so a hold between two moves stays perfectly still.
 * Input frames must strictly increase.
 */
export const kf = (frame: number, input: number[], output: number[], easing = EASE) =>
  interpolate(frame, input, output, { ...clamp, easing });

/** 0 → 1 between `start` and `start + duration` frames of the current sequence. */
export const useProgress = (start: number, duration: number) => kf(useCurrentFrame(), [start, start + duration], [0, 1]);

/** 1 → 0 over the sequence's last `frames` frames: drive a scene's exit with it. */
export const useExit = (frames = 22) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return kf(frame, [durationInFrames - frames, durationInFrames], [1, 0]);
};

// ── Layout ───────────────────────────────────────────────────────────────────

/** The background every scene sits on. */
export const Page: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.page }) => (
  <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
);

export const Center: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 28, style }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, padding: "100px 120px", ...style }}>
    {children}
  </AbsoluteFill>
);

/** Wrap a whole scene: it lifts up and fades over its last frames, so cuts between scenes can be short. */
export const Exit: React.FC<{ children: React.ReactNode; frames?: number; distance?: number }> = ({ children, frames = 22, distance = 90 }) => {
  const e = useExit(frames);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -distance}px` }}>{children}</AbsoluteFill>;
};

/** Something (usually a device) rising into place from below, then holding perfectly still. */
export const Rise: React.FC<{ children: React.ReactNode; delay?: number; distance?: number; frames?: number; style?: React.CSSProperties }> = ({
  children,
  delay = 0,
  distance = 760,
  frames = 46,
  style,
}) => {
  const frame = useCurrentFrame();
  return <div style={{ translate: `0px ${kf(frame, [delay, delay + frames], [distance, 0])}px`, ...style }}>{children}</div>;
};

/** Fade and drift in from a direction. */
export const Enter: React.FC<{ children: React.ReactNode; delay?: number; frames?: number; from?: "below" | "above" | "left" | "right"; distance?: number; style?: React.CSSProperties }> = ({
  children,
  delay = 0,
  frames = 30,
  from = "below",
  distance = 40,
  style,
}) => {
  const p = useProgress(delay, frames);
  const d = (1 - p) * distance;
  const t = from === "below" ? `0px ${d}px` : from === "above" ? `0px ${-d}px` : from === "left" ? `${-d}px 0px` : `${d}px 0px`;
  return <div style={{ opacity: p, translate: t, ...style }}>{children}</div>;
};

// ── Type ─────────────────────────────────────────────────────────────────────

/** Words slide up into place one after another, each masked so it appears from nowhere. */
export const RevealText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined;
}> = ({ text, delay = 0, stagger = 4, style, wordStyle }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.26em", ...style }}>
      {text.split(" ").map((w, i) => {
        const p = kf(frame, [delay + i * stagger, delay + i * stagger + 32], [0, 1]);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", translate: `0px ${(1 - p) * 110}%`, ...wordStyle?.(w, i) }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Small uppercase label above a headline. */
export const Kicker: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({ children, delay = 0, color = C.accent }) => {
  const p = useProgress(delay, 28);
  return (
    <div style={{ fontFamily: F.label, fontWeight: 700, fontSize: 30, letterSpacing: "0.2em", textTransform: "uppercase", color, opacity: p, translate: `0px ${(1 - p) * 24}px` }}>
      {children}
    </div>
  );
};

/** The big line. Words listed in `accent` take the brand colour. */
export const Headline: React.FC<{ text: string; delay?: number; stagger?: number; size?: number; align?: "center" | "left"; accent?: string[]; color?: string }> = ({
  text,
  delay = 0,
  stagger = 4,
  size = 110,
  align = "center",
  accent = [],
  color = C.ink,
}) => (
  <RevealText
    text={text}
    delay={delay}
    stagger={stagger}
    style={{
      fontFamily: F.display,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.035em",
      color,
      justifyContent: align === "center" ? "center" : "flex-start",
      textAlign: align,
    }}
    wordStyle={(w) => (accent.includes(w.replace(/[.,!?:;]/g, "")) ? { color: C.accent } : undefined)}
  />
);

export const Body: React.FC<{ children: React.ReactNode; delay?: number; size?: number; align?: "center" | "left"; maxWidth?: number; color?: string }> = ({
  children,
  delay = 0,
  size = 40,
  align = "center",
  maxWidth = 1300,
  color = C.muted,
}) => {
  const p = useProgress(delay, 30);
  return (
    <div style={{ fontFamily: F.body, fontSize: size, lineHeight: 1.32, color, textAlign: align, maxWidth, opacity: p, translate: `0px ${(1 - p) * 26}px` }}>
      {children}
    </div>
  );
};

/** One word in a sentence that changes: "Built for [teams|founders|agencies]." */
export const WordSwap: React.FC<{ words: string[]; every?: number; delay?: number; style?: React.CSSProperties }> = ({ words, every = 36, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - delay);
  const i = Math.min(words.length - 1, Math.floor(t / every));
  const local = t - i * every;
  const inP = i === 0 && frame < delay ? 0 : kf(local, [0, 14], [0, 1]);
  const outP = i === words.length - 1 ? 0 : kf(local, [every - 12, every], [0, 1]);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em", ...style }}>
      <span style={{ display: "inline-block", translate: `0px ${(1 - inP) * 100 - outP * 100}%`, color: C.accent }}>{words[i]}</span>
    </span>
  );
};

/** A number that counts up with the house ease: <CountUp to={98} suffix="%" />. */
export const CountUp: React.FC<{ to: number; from?: number; delay?: number; frames?: number; decimals?: number; prefix?: string; suffix?: string; style?: React.CSSProperties }> = ({
  to,
  from = 0,
  delay = 0,
  frames = 45,
  decimals = 0,
  prefix = "",
  suffix = "",
  style,
}) => {
  const v = from + (to - from) * useProgress(delay, frames);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {v.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};

/** Text typed into a field, character by character, with a blinking caret. */
export const Typewriter: React.FC<{ text: string; delay?: number; cps?: number; caret?: boolean; style?: React.CSSProperties }> = ({ text, delay = 0, cps = 22, caret = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - delay) / fps) * cps)));
  const blink = Math.floor(frame / 15) % 2 === 0 || n < text.length;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret ? <span style={{ opacity: blink ? 1 : 0, marginLeft: 2 }}>|</span> : null}
    </span>
  );
};

// ── Emphasis ─────────────────────────────────────────────────────────────────

/** 0 → 1 → 0 over a punch in: in (36 frames), hold, out (36). */
export const usePunch = (at: number, hold: number) => {
  const h = Math.max(1, hold);
  return kf(useCurrentFrame(), [at, at + 36, at + 36 + h, at + 72 + h], [0, 1, 1, 0]);
};

/**
 * Punch the camera in on one part of whatever it wraps: zoom around (x, y) (fractions of the
 * wrapped box), hold, then back out. Fade neighbouring text by usePunch() so the zoom never covers it.
 */
export const PunchIn: React.FC<{ children: React.ReactNode; at: number; hold: number; zoom?: number; x: number; y: number; style?: React.CSSProperties }> = ({
  children,
  at,
  hold,
  zoom = 1.8,
  x,
  y,
  style,
}) => {
  const z = 1 + (zoom - 1) * usePunch(at, hold);
  return <div style={{ scale: String(z), transformOrigin: `${x * 100}% ${y * 100}%`, ...style }}>{children}</div>;
};

/** A ring drawn around a region (fractions of the parent), with the rest dimmed. Put it inside a positioned parent. */
export const Highlight: React.FC<{ x: number; y: number; w: number; h: number; delay?: number; until?: number; radius?: number; dim?: number }> = ({
  x,
  y,
  w,
  h,
  delay = 0,
  until,
  radius = 18,
  dim = 0.35,
}) => {
  const frame = useCurrentFrame();
  const p = until ? kf(frame, [delay, delay + 16, until, until + 16], [0, 1, 1, 0]) : kf(frame, [delay, delay + 16], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        borderRadius: radius,
        border: `4px solid ${C.accentBright}`,
        boxShadow: `0 0 0 9999px rgba(10,10,14,${dim * p})`,
        opacity: p,
        pointerEvents: "none",
      }}
    />
  );
};

/** A pointer that glides between points (pixels in its parent) and clicks at each `click` frame. */
export const Cursor: React.FC<{ path: { at: number; x: number; y: number; click?: boolean }[]; travel?: number }> = ({ path, travel = 24 }) => {
  const frame = useCurrentFrame();
  let x = path[0].x;
  let y = path[0].y;
  let press = 0;
  let ripple = -1;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const t = kf(frame, [b.at - travel, b.at], [0, 1]);
    if (frame >= b.at - travel) {
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    }
    if (b.click && frame >= b.at - 3 && frame <= b.at + 18) {
      press = interpolate(frame, [b.at - 3, b.at, b.at + 5], [0, 1, 0], clamp);
      ripple = (frame - b.at + 2) / 16;
    }
  }
  return (
    <>
      {ripple > 0 && ripple < 1 ? (
        <div style={{ position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 999, border: `5px solid ${C.accentBright}`, opacity: 1 - ripple, scale: String(0.3 + ripple * 1.1) }} />
      ) : null}
      <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 7, top: y - 4, scale: String(1 - press * 0.14), transformOrigin: "7px 4px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" }}>
        <path d="M5.5 3.2v15.6l4.3-4.1 2.9 6.4 2.7-1.2-2.9-6.3h6z" fill="#fff" stroke="#1D1D1F" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** Children appear one after another (cards, features, logos). */
export const Stagger: React.FC<{ children: React.ReactNode[]; delay?: number; every?: number; style?: React.CSSProperties }> = ({ children, delay = 0, every = 6, style }) => (
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, ...style }}>
    {children.map((c, i) => (
      <Enter key={i} delay={delay + i * every}>
        {c}
      </Enter>
    ))}
  </div>
);
