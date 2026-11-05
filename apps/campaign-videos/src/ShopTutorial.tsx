import React from "react";
import { AbsoluteFill, Easing, Html5Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import manifest from "./tutorials/shop-steps.json";
import { C, dosis, roboto } from "./theme";
import { Body, Center, Headline, Kicker, Logo, Page, kf, useExit } from "./ui";

/**
 * Admin help, video 2: everything a Store Admin can do, step by step.
 *
 * Every screen is the real /admin, filmed by capture/shop-tutorial.cjs against a pretend shop
 * (capture/admin-mock-supabase.cjs + capture/shop-seed.cjs), so what's saved really saves and shows
 * up on the next screen. The frames (public/tutorial/shop/, gitignored) and this step list
 * (src/tutorials/shop-steps.json) come from one capture run; re-run it to remake them.
 *
 * Music: "Inspired" by Kevin MacLeod (incompetech.com), licensed under Creative Commons:
 * By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Credit it in the YouTube description.
 */

type Box = { x: number; y: number; w: number; h: number };
type Step = {
  chapter: string;
  caption: string;
  target: Box | null;
  kind: string;
  before: string;
  frames: string[];
  after: string;
  zoom: number;
  hold: number;
  /** The click opened another page. */
  nav?: boolean;
};
const STEPS = (manifest as unknown as { steps: Step[] }).steps;

const FPS = 30;
const W = 1920;
const H = 1080;
const ACT = 28; // frame of the click, once the cursor has arrived
const BITE = 8; // frames per typing bite
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Seconds a caption needs to be read: at least the step's hold. */
const holdFor = (s: Step) => Math.max(s.hold, s.caption.split(/\s+/).length * 0.3 + 0.7);
const actionEnd = (s: Step) => ACT + (s.frames.length ? s.frames.length * BITE : 0) + 6;
const stepFrames = (s: Step) => Math.round(actionEnd(s) + holdFor(s) * FPS);

// ── Camera ─────────────────────────────────────────────────────────────────
type Cam = { z: number; cx: number; cy: number };
const WIDE: Cam = { z: 1, cx: 0.5, cy: 0.5 };
const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const camFor = (s: Step | undefined): Cam => (s?.target && s.zoom > 1 ? { z: s.zoom, cx: centre(s.target).x, cy: centre(s.target).y } : WIDE);
/** Where a camera leaves the screen once its step is done (pulled back out after opening a page). */
const endCam = (s: Step | undefined): Cam => (s?.nav ? WIDE : camFor(s));
const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ z: lerp(a.z, b.z, t), cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t) });
/** Translate for a camera, clamped so the screenshot always fills the frame. */
function offset(c: Cam) {
  const tx = Math.min(0, Math.max(W - W * c.z, W / 2 - c.cx * W * c.z));
  const ty = Math.min(0, Math.max(H - H * c.z, H / 2 - c.cy * H * c.z));
  return { tx, ty };
}
const toScreen = (c: Cam, x: number, y: number) => {
  const { tx, ty } = offset(c);
  return { x: x * W * c.z + tx, y: y * H * c.z + ty };
};

// ── Pieces ─────────────────────────────────────────────────────────────────
const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 7, top: y - 4, scale: String(1 - press * 0.14), transformOrigin: "7px 4px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" }}>
    <path d="M5.5 3.2v15.6l4.3-4.1 2.9 6.4 2.7-1.2-2.9-6.3h6z" fill="#fff" stroke="#1D1D1F" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

const Ripple: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) =>
  t <= 0 || t >= 1 ? null : (
    <div style={{ position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 999, border: `5px solid ${C.orange}`, opacity: 1 - t, scale: String(0.3 + t * 1.1) }} />
  );

const Caption: React.FC<{ chapter: string; text: string; top: boolean; index: number }> = ({ chapter, text, top, index }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, 0, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, [top ? "top" : "bottom"]: 46, display: "flex", justifyContent: "center", opacity: p, translate: `0px ${(1 - p) * (top ? -18 : 18)}px` }}>
      <div style={{ maxWidth: 1480, padding: "22px 34px 24px", borderRadius: 26, background: "rgba(255,255,255,0.97)", boxShadow: "0 18px 50px rgba(0,0,0,0.22)", display: "flex", gap: 26, alignItems: "center" }}>
        <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 16, background: C.orange, color: C.white, fontFamily: roboto, fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{index}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: dosis, fontWeight: 700, fontSize: 21, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accent }}>{chapter}</div>
          <div style={{ fontFamily: roboto, fontWeight: 600, fontSize: 38, lineHeight: 1.22, letterSpacing: "-0.01em", color: C.ink }}>{text}</div>
        </div>
      </div>
    </div>
  );
};

/** One step: the camera eases to the target, the cursor travels there and clicks, the screen changes. */
const StepScene: React.FC<{ step: Step; prev?: Step; index: number }> = ({ step, prev, index }) => {
  const frame = useCurrentFrame();
  const from = endCam(prev);
  const to = camFor(step);
  let cam = mixCam(from, to, prog(frame, 0, 24));
  const end = actionEnd(step);
  if (step.nav) cam = mixCam(cam, WIDE, prog(frame, end + 4, end + 26));

  // Which screenshot is showing.
  const seq = [step.before, ...step.frames, step.after];
  const switchAt = (i: number) => (i <= step.frames.length ? ACT + (i - 1) * BITE : end - 2);
  let shown = 0;
  for (let i = 1; i < seq.length; i++) if (frame >= switchAt(i)) shown = i;
  const fadeIn = prog(frame, switchAt(shown), switchAt(shown) + 5);

  // Cursor: from the last target to this one, in screenshot space, then onto the screen.
  const last = prev?.target ? centre(prev.target) : { x: 0.62, y: 0.6 };
  const goal = step.target ? centre(step.target) : last;
  const m = prog(frame, 2, ACT - 2);
  const p = { x: lerp(last.x, goal.x, m), y: lerp(last.y, goal.y, m) };
  const cur = toScreen(cam, p.x, p.y);
  const clicks = step.kind !== "none" && step.kind !== "point" && step.target;
  const press = clicks ? interpolate(frame, [ACT - 3, ACT, ACT + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const { tx, ty } = offset(cam);

  // Caption moves to the top when what it's about sits low on the screen.
  const tgt = step.target ? toScreen(to, centre(step.target).x, centre(step.target).y) : null;
  const top = tgt ? tgt.y > H * 0.6 : false;

  return (
    <AbsoluteFill style={{ background: "#f5f7fa", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", translate: `${tx}px ${ty}px`, scale: String(cam.z) }}>
        {seq.map((src, i) =>
          i === shown || i === shown - 1 ? (
            <Img key={`${src}-${i}`} src={staticFile(`tutorial/shop/${src}`)} style={{ position: "absolute", inset: 0, width: W, height: H, opacity: i === shown ? (shown === 0 ? 1 : fadeIn) : 1 }} />
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
            border: `4px solid ${C.orange}`,
            boxShadow: "0 0 0 9999px rgba(20,22,26,0.18)",
            opacity: prog(frame, ACT - 6, ACT + 6),
          }}
        />
      ) : null}
      {clicks ? <Ripple x={cur.x} y={cur.y} t={(frame - ACT + 2) / 16} /> : null}
      <Cursor x={cur.x} y={cur.y} press={press} />
      <Caption chapter={step.chapter} text={step.caption} top={top} index={index} />
    </AbsoluteFill>
  );
};

// ── Cards ──────────────────────────────────────────────────────────────────
const CHAPTERS = STEPS.reduce<string[]>((list, s) => (list.includes(s.chapter) ? list : [...list, s.chapter]), []);

const Exit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const e = useExit(14);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -60}px` }}>{children}</AbsoluteFill>;
};

const IntroCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={30}>
          <Kicker>Admin help · Store Admin</Kicker>
          <Headline text="Running the shop." size={124} accent={["shop"]} />
          <Body delay={24} size={40}>
            Everything a Store Admin can do, step by step, on the real admin.
          </Body>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, width: 1500, marginTop: 24 }}>
            {CHAPTERS.map((c, i) => {
              const p = kf(frame, [46 + i * 5, 70 + i * 5], [0, 1]);
              return (
                <div key={c} style={{ padding: "12px 24px", borderRadius: 999, background: C.page, fontFamily: roboto, fontWeight: 600, fontSize: 28, color: C.ink, opacity: p, translate: `0px ${(1 - p) * 20}px` }}>
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

const ChapterCard: React.FC<{ n: number; title: string }> = ({ n, title }) => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={26}>
        <Kicker>
          Part {n} of {CHAPTERS.length}
        </Kicker>
        <Headline text={title} size={120} />
      </Center>
    </Exit>
  </Page>
);

const OutroCard: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={34}>
        <Headline text="That’s the whole shop." size={112} accent={["whole"]} />
        <Body delay={24} size={42}>
          Want to practise first? Take the admin tour: it uses the real pages in test mode, and nothing is saved.
        </Body>
        <Body delay={44} size={42} color={C.ink}>
          Stuck later? Open Help in the sidebar and come back to this video.
        </Body>
      </Center>
    </Exit>
  </Page>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Center gap={30}>
        <div style={{ opacity: kf(frame, [2, 28], [0, 1]) }}>
          <Logo width={560} />
        </div>
        <div style={{ fontFamily: dosis, fontWeight: 700, fontSize: 32, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, opacity: kf(frame, [24, 50], [0, 1]) }}>
          destinytees.uk/admin/help
        </div>
      </Center>
    </Page>
  );
};

/** A thin bar along the bottom: how far through the video, split by part. */
const Progress: React.FC<{ marks: number[] }> = ({ marks }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 7, background: "rgba(0,0,0,0.06)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(frame / durationInFrames) * 100}%`, background: C.orange }} />
      {marks.map((m) => (
        <div key={m} style={{ position: "absolute", top: 0, bottom: 0, left: `${(m / durationInFrames) * 100}%`, width: 3, background: C.white }} />
      ))}
    </div>
  );
};

// ── Timeline ───────────────────────────────────────────────────────────────
const INTRO = 7 * FPS;
const CHAPTER_CARD = Math.round(2.4 * FPS);
const OUTRO = 8 * FPS;
const END = 4 * FPS;

type Segment = { from: number; dur: number; el: React.ReactNode; name: string };
function timeline(): { segs: Segment[]; total: number; marks: number[] } {
  const segs: Segment[] = [];
  const marks: number[] = [];
  let t = 0;
  const add = (name: string, dur: number, el: React.ReactNode) => {
    segs.push({ from: t, dur, el, name });
    t += dur;
  };
  add("Intro", INTRO, <IntroCard />);
  let chapter = "";
  STEPS.forEach((s, i) => {
    if (s.chapter !== chapter) {
      chapter = s.chapter;
      marks.push(t);
      add(`Part: ${chapter}`, CHAPTER_CARD, <ChapterCard n={CHAPTERS.indexOf(chapter) + 1} title={chapter} />);
    }
    // A step straight after a chapter card starts wide, as if from a fresh screen.
    const prev = i > 0 && STEPS[i - 1].chapter === s.chapter ? STEPS[i - 1] : undefined;
    add(`${i + 1}. ${s.caption.slice(0, 40)}`, stepFrames(s), <StepScene step={s} prev={prev} index={i + 1} />);
  });
  marks.push(t);
  add("Outro", OUTRO, <OutroCard />);
  add("End", END, <EndCard />);
  return { segs, total: t, marks };
}
const TL = timeline();
export const SHOP_TUTORIAL_FRAMES = TL.total;

const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Html5Audio
      src={staticFile("audio/inspired.mp3")}
      loop
      volume={(f) => interpolate(f, [0, 15, durationInFrames - 100, durationInFrames - 2], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

export const ShopTutorial: React.FC = () => (
  <AbsoluteFill style={{ background: C.white }}>
    <Music />
    {TL.segs.map((s) => (
      <Sequence key={s.name + s.from} from={s.from} durationInFrames={s.dur} name={s.name}>
        {s.el}
      </Sequence>
    ))}
    <Progress marks={TL.marks} />
  </AbsoluteFill>
);
