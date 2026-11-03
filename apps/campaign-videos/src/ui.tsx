import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, dosis, roboto } from "./theme";

const ease = Easing.bezier(...EASE);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 over `duration` frames starting at `start`, eased. */
export const useProgress = (start: number, duration: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing: ease });
};

/** Fades the whole scene out over its last `frames` frames. */
export const useExit = (frames = 12) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], clamp);
};

/** Words rise and un-blur one after another, the way Apple films set headlines. */
export const RevealText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined;
}> = ({ text, delay = 0, stagger = 4, style, wordStyle }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.26em", ...style }}>
      {words.map((w, i) => {
        const start = delay + i * stagger;
        const p = interpolate(frame, [start, start + 22], [0, 1], { ...clamp, easing: ease });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              translate: `0px ${(1 - p) * 34}px`,
              filter: `blur(${(1 - p) * 12}px)`,
              ...wordStyle?.(w, i),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Kicker: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({ children, delay = 0, color = C.orange }) => {
  const p = useProgress(delay, 20);
  return (
    <div
      style={{
        fontFamily: dosis,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        opacity: p,
        translate: `0px ${(1 - p) * 16}px`,
      }}
    >
      {children}
    </div>
  );
};

export const Headline: React.FC<{ text: string; delay?: number; stagger?: number; size?: number; color?: string; align?: "center" | "left"; accent?: string[] }> = ({
  text,
  delay = 0,
  stagger = 4,
  size = 120,
  color = C.white,
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
      lineHeight: 1.04,
      letterSpacing: "-0.035em",
      color,
      justifyContent: align === "center" ? "center" : "flex-start",
      textAlign: align,
    }}
    wordStyle={(w) => (accent.includes(w.replace(/[.,!?]/g, "")) ? { color: C.orange } : undefined)}
  />
);

export const Body: React.FC<{ children: React.ReactNode; delay?: number; size?: number; align?: "center" | "left"; color?: string; maxWidth?: number }> = ({
  children,
  delay = 0,
  size = 46,
  align = "center",
  color = C.muted,
  maxWidth = 1300,
}) => {
  const p = useProgress(delay, 24);
  return (
    <div
      style={{
        fontFamily: roboto,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1.3,
        color,
        textAlign: align,
        maxWidth,
        opacity: p,
        translate: `0px ${(1 - p) * 20}px`,
      }}
    >
      {children}
    </div>
  );
};

/** Soft pillar-coloured light behind products. */
export const Glow: React.FC<{ colors?: string[]; intensity?: number; drift?: number }> = ({ colors = [C.orange, C.purple, C.blue], intensity = 0.55, drift = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {colors.map((c, i) => {
        const a = (frame / 90) * drift + i * 2.1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 1100,
              height: 1100,
              left: 960 - 550 + Math.cos(a) * 420 + (i - 1) * 380,
              top: 540 - 550 + Math.sin(a * 0.8) * 220,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${c} 0%, transparent 62%)`,
              opacity: intensity,
              filter: "blur(80px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** A plain, unbranded browser window. */
export const Browser: React.FC<{ width: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ width, children, style }) => {
  const height = (width / 1440) * 900;
  return (
    <div
      style={{
        width,
        borderRadius: 22,
        overflow: "hidden",
        background: "#1C1C1F",
        boxShadow: "0 60px 140px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", background: "#232327" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: width * 0.34, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.08)" }} />
        </div>
        <div style={{ width: 69 }} />
      </div>
      <div style={{ position: "relative", width, height, overflow: "hidden", background: "#fff" }}>{children}</div>
    </div>
  );
};

/** A generic modern phone. Content is laid out at 393pt wide (iPhone 15/16 Pro). */
export const Phone: React.FC<{ height: number; children: React.ReactNode; style?: React.CSSProperties; dark?: boolean }> = ({ height, children, style, dark }) => {
  const width = height * (393 / 852);
  const bezel = height * 0.018;
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        padding: bezel,
        borderRadius: height * 0.13,
        background: "linear-gradient(145deg, #3a3a3e, #121214 60%, #2a2a2e)",
        boxShadow: "0 50px 120px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.12)",
        ...style,
      }}
    >
      <div style={{ position: "relative", width, height, borderRadius: height * 0.115, overflow: "hidden", background: dark ? "#1A110A" : "#fff" }}>
        {children}
        <div
          style={{
            position: "absolute",
            top: height * 0.013,
            left: "50%",
            width: width * 0.32,
            height: height * 0.043,
            marginLeft: -(width * 0.16),
            borderRadius: 999,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};

/** A screenshot that fills its frame, optionally scrolling from `from` to `to` (fractions of the scrollable distance). */
export const Shot: React.FC<{
  src: string;
  frameWidth: number;
  frameHeight: number;
  imageAspect: number; // height / width of the source image
  scrollFrom?: number;
  scrollTo?: number;
  start?: number;
  duration?: number;
  topOffset?: number; // fraction of frame height to push the image down (hide web chrome / status bar)
}> = ({ src, frameWidth, frameHeight, imageAspect, scrollFrom = 0, scrollTo = 0, start = 0, duration = 1, topOffset = 0 }) => {
  const frame = useCurrentFrame();
  const imgH = frameWidth * imageAspect;
  const maxScroll = Math.max(0, imgH - frameHeight);
  const t = interpolate(frame, [start, start + duration], [scrollFrom, scrollTo], {
    ...clamp,
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  return (
    <Img
      src={staticFile(src)}
      style={{ position: "absolute", left: 0, top: topOffset * frameHeight - t * maxScroll, width: frameWidth, height: imgH }}
    />
  );
};

/** The iOS Liquid Glass tab bar Destiny One shows at the bottom on iPhone (the web build draws it differently). */
export const GlassTabBar: React.FC<{ scale: number; active?: 0 | 1 | 2; badge?: number; dark?: boolean }> = ({ scale, active = 0, badge, dark }) => {
  const ink = dark ? "#F5F1EC" : "#1C1F23";
  const tint = dark ? "#F58021" : "#C9691B";
  const icon = (i: number) => (i === active ? tint : ink);
  const u = scale;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 26 * u,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6 * u,
          padding: 6 * u,
          borderRadius: 999,
          background: dark ? "rgba(40,30,22,0.72)" : "rgba(255,255,255,0.72)",
          backdropFilter: "blur(18px)",
          boxShadow: `0 ${8 * u}px ${30 * u}px rgba(0,0,0,0.18), inset 0 0 0 ${1 * u}px ${dark ? "rgba(255,255,255,0.12)" : "rgba(54,63,72,0.12)"}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "relative",
              width: 78 * u,
              height: 50 * u,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: i === active ? (dark ? "rgba(255,255,255,0.1)" : "rgba(54,63,72,0.08)") : "transparent",
            }}
          >
            <svg width={26 * u} height={26 * u} viewBox="0 0 24 24" fill="none" stroke={icon(i)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {i === 0 && (
                <>
                  <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill={i === active ? icon(i) : "none"} />
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
                  top: 4 * u,
                  right: 16 * u,
                  minWidth: 20 * u,
                  height: 20 * u,
                  borderRadius: 999,
                  background: "#FF3B30",
                  color: "#fff",
                  fontFamily: roboto,
                  fontWeight: 700,
                  fontSize: 13 * u,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {badge}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/** A Destiny One screen inside a phone: screenshot, then the glass tab bar on tab screens. */
export const AppScreen: React.FC<{
  src: string;
  height: number;
  aspect?: number;
  tabs?: boolean;
  dark?: boolean;
  scrollFrom?: number;
  scrollTo?: number;
  start?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ src, height, aspect = 852 / 393, tabs, dark, scrollFrom, scrollTo, start, duration, style }) => {
  const width = height * (393 / 852);
  return (
    <Phone height={height} dark={dark} style={style}>
      {/* Status bar space: the screenshots start below it. */}
      <div style={{ position: "absolute", inset: 0, background: dark ? "#1A110A" : "#fff" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.058, bottom: 0, overflow: "hidden" }}>
        <Shot
          src={src}
          frameWidth={width}
          frameHeight={height * 0.942}
          imageAspect={aspect}
          scrollFrom={scrollFrom}
          scrollTo={scrollTo}
          start={start}
          duration={duration}
        />
      </div>
      <StatusBar height={height} dark={dark} />
      {tabs && <GlassTabBar scale={height / 852} badge={3} dark={dark} />}
    </Phone>
  );
};

export const StatusBar: React.FC<{ height: number; dark?: boolean }> = ({ height, dark }) => {
  const u = height / 852;
  const ink = dark ? "#fff" : "#000";
  return (
    <div
      style={{
        position: "absolute",
        top: 16 * u,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        padding: `0 ${34 * u}px`,
        fontFamily: roboto,
        fontWeight: 700,
        fontSize: 16 * u,
        color: ink,
      }}
    >
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6 * u, alignItems: "center" }}>
        <svg width={18 * u} height={12 * u} viewBox="0 0 18 12" fill={ink}>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="7" rx="1" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width={26 * u} height={12 * u} viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={ink} opacity="0.5" />
          <rect x="2" y="2" width="17" height="8" rx="2" fill={ink} />
          <rect x="24" y="4" width="2" height="4" rx="1" fill={ink} opacity="0.5" />
        </svg>
      </span>
    </div>
  );
};

export const Logo: React.FC<{ width: number; variant?: "dark-bg" | "light-bg"; style?: React.CSSProperties }> = ({ width, variant = "dark-bg", style }) => (
  <Img
    src={staticFile(variant === "dark-bg" ? "brand/logo-colour-white.svg" : "brand/logo-colour.svg")}
    style={{ width, height: width * (1080 / 4920), ...style }}
  />
);

export const AppIcon: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <Img
    src={staticFile("brand/destiny-one-icon.png")}
    style={{ width: size, height: size, borderRadius: size * 0.2237, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", ...style }}
  />
);

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; gap?: number }> = ({ children, style, gap = 28 }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, padding: "100px 120px", ...style }}>
    {children}
  </AbsoluteFill>
);
