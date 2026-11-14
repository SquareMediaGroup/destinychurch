// Real Motion: walkthrough films (tutorials, how-tos, feature demos) from a captured step list.
// capture/record.cjs films the real product and writes { viewport, steps } plus before/after frames;
// defineWalkthrough() turns that into a composition: intro, a card per part, each step with a
// cursor glide, click ripple, camera punch-in and caption, then an outro and end card.
import React from "react";
import { AbsoluteFill, Html5Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_SOFT, F, FPS } from "./theme";
import { Body, Center, Exit, Headline, Kicker, Page, kf } from "./motion";

type Box = { x: number; y: number; w: number; h: number };
export type Step = {
  chapter: string;
  caption: string;
  /** Element box as fractions of the viewport, from the before frame. */
  target: Box | null;
  kind: "click" | "type" | "point" | "none" | string;
  before: string;
  /** Extra frames while typing. */
  frames: string[];
  after: string;
  zoom: number;
  /** Least seconds to hold the result. */
  hold: number;
  /** The action opened another page: the camera pulls back out. */
  nav?: boolean;
};

export type WalkthroughInfo = {
  /** Folder under public/ holding the frames, e.g. "walkthrough/onboarding". */
  dir: string;
  steps: Step[];
  kicker: string;
  title: string;
  accent?: string[];
  blurb: string;
  /** Outro lines: what to do next, where help is. */
  outro?: { title: string; lines: string[] };
  /** End card: logo (public/ path) and a short address. */
  end?: { logo?: string; logoWidth?: number; text?: string };
  /** Background music (public/ path) and its level, 0..1. */
  music?: { src: string; volume?: number };
};

const W = 1920;
const H = 1080;
const ACT = 28; // frame of the click, once the cursor has arrived
const BITE = 8; // frames per typing bite
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (frame: number, from: number, to: number) => kf(frame, [from, to], [0, 1], EASE_SOFT);

/** Seconds a caption needs to be read: at least the step's hold, about 0.3 s a word. */
const holdFor = (s: Step) => Math.max(s.hold, s.caption.split(/\s+/).length * 0.3 + 0.7);
const actionEnd = (s: Step) => ACT + (s.frames.length ? s.frames.length * BITE : 0) + 6;
export const stepFrames = (s: Step) => Math.round(actionEnd(s) + holdFor(s) * FPS);

type Cam = { z: number; cx: number; cy: number };
const WIDE: Cam = { z: 1, cx: 0.5, cy: 0.5 };
const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const camFor = (s: Step | undefined): Cam => (s?.target && s.zoom > 1 ? { z: s.zoom, cx: centre(s.target).x, cy: centre(s.target).y } : WIDE);
const endCam = (s: Step | undefined): Cam => (s?.nav ? WIDE : camFor(s));
const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ z: lerp(a.z, b.z, t), cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t) });
function offset(c: Cam) {
  const tx = Math.min(0, Math.max(W - W * c.z, W / 2 - c.cx * W * c.z));
  const ty = Math.min(0, Math.max(H - H * c.z, H / 2 - c.cy * H * c.z));
  return { tx, ty };
}
const toScreen = (c: Cam, x: number, y: number) => {
  const { tx, ty } = offset(c);
  return { x: x * W * c.z + tx, y: y * H * c.z + ty };
};

const Pointer: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 7, top: y - 4, scale: String(1 - press * 0.14), transformOrigin: "7px 4px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" }}>
    <path d="M5.5 3.2v15.6l4.3-4.1 2.9 6.4 2.7-1.2-2.9-6.3h6z" fill="#fff" stroke="#1D1D1F" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

const Caption: React.FC<{ chapter: string; text: string; top: boolean; index: number }> = ({ chapter, text, top, index }) => {
  const p = prog(useCurrentFrame(), 0, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, [top ? "top" : "bottom"]: 46, display: "flex", justifyContent: "center", opacity: p, translate: `0px ${(1 - p) * (top ? -18 : 18)}px` }}>
      <div style={{ maxWidth: 1480, padding: "22px 34px 24px", borderRadius: 26, background: "rgba(255,255,255,0.97)", boxShadow: "0 18px 50px rgba(0,0,0,0.22)", display: "flex", gap: 26, alignItems: "center" }}>
        <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 16, background: C.accentBright, color: C.white, fontFamily: F.body, fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{index}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: F.label, fontWeight: 700, fontSize: 21, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accent }}>{chapter}</div>
          <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 38, lineHeight: 1.22, letterSpacing: "-0.01em", color: C.ink }}>{text}</div>
        </div>
      </div>
    </div>
  );
};

const StepScene: React.FC<{ step: Step; prev?: Step; index: number; dir: string }> = ({ step, prev, index, dir }) => {
  const frame = useCurrentFrame();
  let cam = mixCam(endCam(prev), camFor(step), prog(frame, 0, 24));
  const end = actionEnd(step);
  if (step.nav) cam = mixCam(cam, WIDE, prog(frame, end + 4, end + 26));

  const seq = [step.before, ...step.frames, step.after];
  const switchAt = (i: number) => (i <= step.frames.length ? ACT + (i - 1) * BITE : end - 2);
  let shown = 0;
  for (let i = 1; i < seq.length; i++) if (frame >= switchAt(i)) shown = i;
  const fadeIn = prog(frame, switchAt(shown), switchAt(shown) + 5);

  const last = prev?.target ? centre(prev.target) : { x: 0.62, y: 0.6 };
  const goal = step.target ? centre(step.target) : last;
  const m = prog(frame, 2, ACT - 2);
  const cur = toScreen(cam, lerp(last.x, goal.x, m), lerp(last.y, goal.y, m));
  const clicks = step.kind !== "none" && step.kind !== "point" && step.target;
  const press = clicks ? interpolate(frame, [ACT - 3, ACT, ACT + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const ripple = (frame - ACT + 2) / 16;
  const { tx, ty } = offset(cam);
  const to = camFor(step);
  const tgt = step.target ? toScreen(to, centre(step.target).x, centre(step.target).y) : null;
  const top = tgt ? tgt.y > H * 0.6 : false;

  return (
    <AbsoluteFill style={{ background: C.page, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", translate: `${tx}px ${ty}px`, scale: String(cam.z) }}>
        {seq.map((src, i) =>
          i === shown || i === shown - 1 ? (
            <Img key={`${src}-${i}`} src={staticFile(`${dir}/${src}`)} style={{ position: "absolute", inset: 0, width: W, height: H, opacity: i === shown ? (shown === 0 ? 1 : fadeIn) : 1 }} />
          ) : null,
        )}
      </div>
      {step.target && step.kind === "point" ? (
        <div
          style={{
            position: "absolute",
            left: toScreen(cam, step.target.x, step.target.y).x - 10,
            top: toScreen(cam, step.target.x, step.target.y).y - 10,
            width: step.target.w * W * cam.z + 20,
            height: step.target.h * H * cam.z + 20,
            borderRadius: 18,
            border: `4px solid ${C.accentBright}`,
            boxShadow: "0 0 0 9999px rgba(20,22,26,0.18)",
            opacity: prog(frame, ACT - 6, ACT + 6),
          }}
        />
      ) : null}
      {clicks && ripple > 0 && ripple < 1 ? (
        <div style={{ position: "absolute", left: cur.x - 40, top: cur.y - 40, width: 80, height: 80, borderRadius: 999, border: `5px solid ${C.accentBright}`, opacity: 1 - ripple, scale: String(0.3 + ripple * 1.1) }} />
      ) : null}
      <Pointer x={cur.x} y={cur.y} press={press} />
      <Caption chapter={step.chapter} text={step.caption} top={top} index={index} />
    </AbsoluteFill>
  );
};

const chaptersOf = (steps: Step[]) => steps.reduce<string[]>((list, s) => (list.includes(s.chapter) ? list : [...list, s.chapter]), []);

const IntroCard: React.FC<{ info: WalkthroughInfo; chapters: string[] }> = ({ info, chapters }) => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Exit frames={14} distance={60}>
        <Center gap={30}>
          <Kicker>{info.kicker}</Kicker>
          <Headline text={info.title} size={124} accent={info.accent} />
          <Body delay={24}>{info.blurb}</Body>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, width: 1500, marginTop: 24 }}>
            {chapters.map((c, i) => {
              const p = kf(frame, [46 + i * 5, 70 + i * 5], [0, 1]);
              return (
                <div key={c} style={{ padding: "12px 24px", borderRadius: 999, background: C.page, fontFamily: F.body, fontWeight: 600, fontSize: 28, color: C.ink, opacity: p, translate: `0px ${(1 - p) * 20}px` }}>
                  <span style={{ color: C.accent, marginRight: 10 }}>{i + 1}</span>
                  {c}
                </div>
              );
            })}
          </div>
        </Center>
      </Exit>
    </Page>
  );
};

const ChapterCard: React.FC<{ n: number; of: number; title: string }> = ({ n, of, title }) => (
  <Page bg={C.white}>
    <Exit frames={14} distance={60}>
      <Center gap={26}>
        <Kicker>
          Part {n} of {of}
        </Kicker>
        <Headline text={title} size={120} />
      </Center>
    </Exit>
  </Page>
);

const OutroCard: React.FC<{ title: string; lines: string[] }> = ({ title, lines }) => (
  <Page bg={C.white}>
    <Exit frames={14} distance={60}>
      <Center gap={34}>
        <Headline text={title} size={112} />
        {lines.map((l, i) => (
          <Body key={l} delay={24 + i * 20} color={i ? C.ink : C.muted}>
            {l}
          </Body>
        ))}
      </Center>
    </Exit>
  </Page>
);

const EndCard: React.FC<{ logo?: string; logoWidth?: number; text?: string }> = ({ logo, logoWidth = 520, text }) => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Center gap={30}>
        {logo ? <Img src={staticFile(logo)} style={{ width: logoWidth, opacity: kf(frame, [2, 28], [0, 1]) }} /> : null}
        {text ? (
          <div style={{ fontFamily: F.label, fontWeight: 700, fontSize: 32, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, opacity: kf(frame, [24, 50], [0, 1]) }}>{text}</div>
        ) : null}
      </Center>
    </Page>
  );
};

const Progress: React.FC<{ marks: number[] }> = ({ marks }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 7, background: "rgba(0,0,0,0.06)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(frame / durationInFrames) * 100}%`, background: C.accentBright }} />
      {marks.map((m) => (
        <div key={m} style={{ position: "absolute", top: 0, bottom: 0, left: `${(m / durationInFrames) * 100}%`, width: 3, background: C.white }} />
      ))}
    </div>
  );
};

export const INTRO = 7 * FPS;
export const CHAPTER_CARD = Math.round(2.4 * FPS);
export const OUTRO = 8 * FPS;
export const END = 4 * FPS;

type Segment = { from: number; dur: number; el: React.ReactNode; name: string };
function timeline(info: WalkthroughInfo) {
  const chapters = chaptersOf(info.steps);
  const segs: Segment[] = [];
  const marks: number[] = [];
  let t = 0;
  const add = (name: string, dur: number, el: React.ReactNode) => {
    segs.push({ from: t, dur, el, name });
    t += dur;
  };
  add("Intro", INTRO, <IntroCard info={info} chapters={chapters} />);
  let chapter = "";
  info.steps.forEach((s, i) => {
    if (s.chapter !== chapter) {
      chapter = s.chapter;
      marks.push(t);
      add(`Part: ${chapter}`, CHAPTER_CARD, <ChapterCard n={chapters.indexOf(chapter) + 1} of={chapters.length} title={chapter} />);
    }
    const prev = i > 0 && info.steps[i - 1].chapter === s.chapter ? info.steps[i - 1] : undefined;
    add(`${i + 1}. ${s.caption.slice(0, 40)}`, stepFrames(s), <StepScene step={s} prev={prev} index={i + 1} dir={info.dir} />);
  });
  marks.push(t);
  if (info.outro) add("Outro", OUTRO, <OutroCard title={info.outro.title} lines={info.outro.lines} />);
  if (info.end) add("End", END, <EndCard {...info.end} />);
  return { segs, total: t, marks };
}

/** A walkthrough composition and its length in frames: register both in Root.tsx (1920x1080, 30 fps). */
export function defineWalkthrough(info: WalkthroughInfo): { Component: React.FC; frames: number } {
  const tl = timeline(info);
  const Component: React.FC = () => {
    const { durationInFrames } = useVideoConfig();
    return (
      <AbsoluteFill style={{ background: C.white }}>
        {info.music ? (
          <Html5Audio
            src={staticFile(info.music.src)}
            loop
            volume={(f) =>
              interpolate(f, [0, 15, durationInFrames - 100, durationInFrames - 2], [0, info.music?.volume ?? 0.3, info.music?.volume ?? 0.3, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            }
          />
        ) : null}
        {tl.segs.map((s) => (
          <Sequence key={s.name + s.from} from={s.from} durationInFrames={s.dur} name={s.name}>
            {s.el}
          </Sequence>
        ))}
        <Progress marks={tl.marks} />
      </AbsoluteFill>
    );
  };
  return { Component, frames: tl.total };
}
