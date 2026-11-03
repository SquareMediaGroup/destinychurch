import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, dosis, roboto } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Keyframes with the house ease between every pair: kf(frame, [0, 20, 80, 100], [0, 1, 1, 0]).
 * Each segment eases in and out on its own, so a hold between two moves stays perfectly still.
 */
export const kf = (frame: number, input: number[], output: number[]) => interpolate(frame, input, output, { ...clamp, easing: EASE });

/** 0 → 1 between `start` and `start + duration`. */
export const useProgress = (start: number, duration: number) => kf(useCurrentFrame(), [start, start + duration], [0, 1]);

/** 1 → 0 over the scene's last `frames` frames, for the exit move. */
export const useExit = (frames = 16) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return kf(frame, [durationInFrames - frames, durationInFrames], [1, 0]);
};

/** A light page. Every scene sits on one. */
export const Page: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.page }) => (
  <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
);

/** Words slide up into place one after another. */
export const RevealText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined;
}> = ({ text, delay = 0, stagger = 3, style, wordStyle }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.26em", ...style }}>
      {words.map((w, i) => {
        const p = kf(frame, [delay + i * stagger, delay + i * stagger + 24], [0, 1]);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", translate: `0px ${(1 - p) * 110}%`, ...wordStyle?.(w, i) }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

export const Kicker: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const p = useProgress(delay, 22);
  return (
    <div
      style={{
        fontFamily: dosis,
        fontWeight: 700,
        fontSize: 32,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: C.accent,
        opacity: p,
        translate: `0px ${(1 - p) * 24}px`,
      }}
    >
      {children}
    </div>
  );
};

export const Headline: React.FC<{ text: string; delay?: number; stagger?: number; size?: number; align?: "center" | "left"; accent?: string[] }> = ({
  text,
  delay = 0,
  stagger = 3,
  size = 110,
  align = "center",
  accent = [],
}) => (
  <RevealText
    text={text}
    delay={delay}
    stagger={stagger}
    style={{
      fontFamily: roboto,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.035em",
      color: C.ink,
      justifyContent: align === "center" ? "center" : "flex-start",
      textAlign: align,
    }}
    wordStyle={(w) => (accent.includes(w.replace(/[.,!?]/g, "")) ? { color: C.accent } : undefined)}
  />
);

export const Body: React.FC<{ children: React.ReactNode; delay?: number; size?: number; align?: "center" | "left"; maxWidth?: number; color?: string }> = ({
  children,
  delay = 0,
  size = 42,
  align = "center",
  maxWidth = 1300,
  color = C.muted,
}) => {
  const p = useProgress(delay, 24);
  return (
    <div style={{ fontFamily: roboto, fontSize: size, lineHeight: 1.32, color, textAlign: align, maxWidth, opacity: p, translate: `0px ${(1 - p) * 26}px` }}>
      {children}
    </div>
  );
};

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; gap?: number }> = ({ children, style, gap = 28 }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, padding: "100px 120px", ...style }}>
    {children}
  </AbsoluteFill>
);

// ── Apple product bezels (public/bezels, fetched by scripts/get-bezels.sh, not committed) ──
// Screen openings measured from Apple's PNGs.
const IPHONE = { w: 1350, h: 2760, screen: { x: 72, y: 69, w: 1206, h: 2622 }, radius: 190 };
const MACBOOK = { w: 3860, h: 2540, screen: { x: 418, y: 288, w: 3024, h: 1964 } };
// iPhone 18 Pro in points: 402 x 874, of which the top 62 are the status bar.
const STATUS_PT = 62;

/** A screenshot inside Apple's iPhone 18 Pro bezel. Screenshots are 402x812pt (@3x), or taller to scroll. */
export const IPhone: React.FC<{
  src: string;
  height: number;
  color?: "silver" | "black";
  dark?: boolean;
  tabs?: boolean;
  /** Source height in points when the screenshot is taller than the screen (a scrolling capture). */
  sourcePt?: number;
  scroll?: number; // 0..1 of the scrollable distance
  style?: React.CSSProperties;
}> = ({ src, height, color = "silver", dark, tabs, sourcePt = 812, scroll = 0, style }) => {
  const k = height / IPHONE.h; // bezel px → video px
  const sw = IPHONE.screen.w * k;
  const sh = IPHONE.screen.h * k;
  const pt = (IPHONE.screen.w / 402) * k; // one point in video px
  const visible = 812 * pt;
  const imgH = sourcePt * pt;
  return (
    <div style={{ position: "relative", width: IPHONE.w * k, height, ...style }}>
      <div
        style={{
          position: "absolute",
          left: IPHONE.screen.x * k,
          top: IPHONE.screen.y * k,
          width: sw,
          height: sh,
          borderRadius: IPHONE.radius * k,
          overflow: "hidden",
          background: dark ? "#1A110A" : "#fff",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: STATUS_PT * pt, width: sw, height: visible, overflow: "hidden" }}>
          <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -scroll * Math.max(0, imgH - visible), width: sw, height: imgH }} />
        </div>
        <StatusBar pt={pt} dark={dark} />
        {tabs && <GlassTabBar pt={pt} dark={dark} badge={3} />}
      </div>
      <Img src={staticFile(`bezels/iphone-18-pro-${color}.png`)} style={{ position: "absolute", inset: 0, width: IPHONE.w * k, height }} />
    </div>
  );
};

/** A website screenshot inside Apple's MacBook Pro 14" bezel. Screenshots are 1512x982pt (@2x), or taller to scroll. */
export const MacBook: React.FC<{
  src: string;
  width: number;
  sourceAspect?: number; // height / width of the screenshot
  scroll?: number;
  children?: React.ReactNode; // drawn over the screen, e.g. a second screenshot
  style?: React.CSSProperties;
}> = ({ src, width, sourceAspect = 982 / 1512, scroll = 0, children, style }) => {
  const k = width / MACBOOK.w;
  const sw = MACBOOK.screen.w * k;
  const sh = MACBOOK.screen.h * k;
  const imgH = sw * sourceAspect;
  return (
    <div style={{ position: "relative", width, height: MACBOOK.h * k, ...style }}>
      <div style={{ position: "absolute", left: MACBOOK.screen.x * k, top: MACBOOK.screen.y * k, width: sw, height: sh, overflow: "hidden", background: "#fff" }}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -scroll * Math.max(0, imgH - sh), width: sw, height: imgH }} />
        {children}
      </div>
      <Img src={staticFile("bezels/macbook-pro-14-silver.png")} style={{ position: "absolute", inset: 0, width, height: MACBOOK.h * k }} />
    </div>
  );
};

/** Size of the MacBook screen inside a MacBook of `width`, for laying screenshots over it. */
export const macScreen = (width: number) => {
  const k = width / MACBOOK.w;
  return { w: MACBOOK.screen.w * k, h: MACBOOK.screen.h * k };
};

const StatusBar: React.FC<{ pt: number; dark?: boolean }> = ({ pt, dark }) => {
  const ink = dark ? "#fff" : "#000";
  return (
    <div
      style={{
        position: "absolute",
        top: 21 * pt,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `0 ${34 * pt}px 0 ${50 * pt}px`,
        fontFamily: roboto,
        fontWeight: 600,
        fontSize: 17 * pt,
        color: ink,
      }}
    >
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6 * pt, alignItems: "center" }}>
        <svg width={18 * pt} height={12 * pt} viewBox="0 0 18 12" fill={ink}>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="7" rx="1" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width={27 * pt} height={13 * pt} viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={ink} opacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill={ink} />
          <path d="M25 4.5v4a2 2 0 0 0 0-4z" fill={ink} opacity="0.4" />
        </svg>
      </span>
    </div>
  );
};

/** Destiny One's floating glass tab bar on iPhone (its web build, used for the screenshots, draws tabs differently). */
const GlassTabBar: React.FC<{ pt: number; dark?: boolean; badge?: number }> = ({ pt, dark, badge }) => {
  const ink = dark ? "#F5F1EC" : "#1C1F23";
  const tint = dark ? "#F58021" : "#C9691B";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30 * pt, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          gap: 4 * pt,
          padding: 5 * pt,
          borderRadius: 999,
          background: dark ? "rgba(40,30,22,0.78)" : "rgba(255,255,255,0.78)",
          backdropFilter: "blur(18px)",
          boxShadow: `0 ${6 * pt}px ${24 * pt}px rgba(0,0,0,0.14), inset 0 0 0 ${1 * pt}px ${dark ? "rgba(255,255,255,0.12)" : "rgba(54,63,72,0.12)"}`,
        }}
      >
        {[0, 1, 2].map((i) => {
          const c = i === 0 ? tint : ink;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                width: 76 * pt,
                height: 48 * pt,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: i === 0 ? (dark ? "rgba(255,255,255,0.1)" : "rgba(54,63,72,0.08)") : "transparent",
              }}
            >
              <svg width={25 * pt} height={25 * pt} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {i === 0 && (
                  <>
                    <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill={c} />
                    <path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2l-3-2h-3" />
                  </>
                )}
                {i === 1 && (
                  <>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </>
                )}
                {i === 2 && (
                  <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </>
                )}
              </svg>
              {i === 0 && badge ? (
                <div
                  style={{
                    position: "absolute",
                    top: 3 * pt,
                    right: 15 * pt,
                    minWidth: 19 * pt,
                    height: 19 * pt,
                    borderRadius: 999,
                    background: "#FF3B30",
                    color: "#fff",
                    fontFamily: roboto,
                    fontWeight: 700,
                    fontSize: 12 * pt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {badge}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Logo: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => (
  <Img src={staticFile("brand/logo-colour.svg")} style={{ width, height: width * (1080 / 4920), ...style }} />
);

export const AppIcon: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <Img src={staticFile("brand/destiny-one-icon.png")} style={{ width: size, height: size, borderRadius: size * 0.2237, boxShadow: "0 20px 50px rgba(0,0,0,0.14)", ...style }} />
);

