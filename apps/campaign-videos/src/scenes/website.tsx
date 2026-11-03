import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, anton, dosis, roboto } from "../theme";
import { AppScreen, Body, Browser, Center, DUO_INNER, DUO_OUTER, Foldable, Glow, Headline, Kicker, Logo, RevealText, ScreenImage, Shot, useExit, useProgress } from "../ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const DESKTOP = 900 / 1440;
const FULL = 2.5; // full-page captures are cropped to 2880 x 7200
const MOBILE = 844 / 390;

const Dark: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.ink }) => (
  <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
);

// 1. Cold open
export const OpenScene: React.FC = () => {
  const exit = useExit(14);
  return (
    <Dark>
      <Center style={{ opacity: exit }}>
        <RevealText
          text="Welcome home."
          delay={14}
          stagger={10}
          style={{ fontFamily: anton, fontSize: 230, letterSpacing: "0.01em", color: C.white, textTransform: "uppercase" }}
        />
        <Body delay={52} size={50}>
          Make real friends. Find real purpose.
        </Body>
      </Center>
    </Dark>
  );
};

// 2. Logo + announcement
export const IntroScene: React.FC = () => {
  const logo = useProgress(4, 30);
  const exit = useExit(14);
  return (
    <Dark>
      <Glow intensity={0.22} />
      <Center gap={60} style={{ opacity: exit }}>
        <div style={{ opacity: logo, scale: String(0.94 + logo * 0.06), filter: `blur(${(1 - logo) * 10}px)` }}>
          <Logo width={760} />
        </div>
        <Headline text="Introducing our new website." delay={34} size={96} accent={["new"]} />
      </Center>
    </Dark>
  );
};

// Before and after: the old site (destinytees.uk), wiped away to reveal the new one.
export const BeforeAfterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useProgress(0, 30);
  const wipe = interpolate(frame, [50, 100], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const exit = useExit(12);
  const W = 1320;
  const H = W * DESKTOP;
  const label = (text: string, side: "left" | "right", visible: number) => (
    <div
      style={{
        position: "absolute",
        top: 24,
        [side]: 24,
        padding: "10px 22px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.6)",
        color: C.white,
        fontFamily: dosis,
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        opacity: visible,
      }}
    >
      {text}
    </div>
  );
  return (
    <Dark>
      <Glow intensity={0.25} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 96, opacity: exit }}>
        <Headline text="A fresh new look." size={96} accent={["new"]} />
        <div style={{ position: "absolute", top: 260, opacity: enter, translate: `0px ${(1 - enter) * 120}px` }}>
          <Browser width={W}>
            <Img src={staticFile("site/home.jpg")} style={{ position: "absolute", width: W, height: H }} />
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${wipe * 100}%)` }}>
              <Img src={staticFile("site/old-home.jpg")} style={{ position: "absolute", width: W, height: H, filter: "saturate(0.7)" }} />
              {label("Before", "right", 1 - wipe)}
            </div>
            {label("After", "left", interpolate(wipe, [0.6, 1], [0, 1], clamp))}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 4, marginLeft: -2, background: C.white, opacity: wipe > 0 && wipe < 1 ? 1 : 0, boxShadow: "0 0 30px rgba(255,255,255,0.8)" }} />
          </Browser>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

// 3. Hero push-in
export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useProgress(0, 40);
  const zoom = interpolate(frame, [0, 165], [1, 1.06], clamp);
  const exit = useExit(12);
  return (
    <Dark>
      <Glow intensity={0.35} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110, opacity: exit }}>
        <Kicker>All new</Kicker>
        <div style={{ height: 18 }} />
        <Headline text="Made for everyone who walks through our doors." delay={8} size={78} />
        <div
          style={{
            position: "absolute",
            top: 380,
            opacity: enter,
            translate: `0px ${(1 - enter) * 160}px`,
            scale: String(zoom),
          }}
        >
          <Browser width={1360}>
            <Shot src="site/home-full.jpg" frameWidth={1360} frameHeight={1360 * DESKTOP} imageAspect={FULL} scrollFrom={0} scrollTo={0.12} start={60} duration={100} />
          </Browser>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

// 4. Smart Search
export const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useProgress(0, 36);
  const typed = interpolate(frame, [70, 82], [0, 1], clamp);
  const answer = interpolate(frame, [128, 142], [0, 1], clamp);
  const zoom = interpolate(frame, [130, 205], [1, 1.55], { ...clamp, easing: ease });
  const exit = useExit(12);
  const W = 1180;
  const H = W * DESKTOP;
  return (
    <Dark>
      <Glow colors={[C.orange, C.purple]} intensity={0.3} />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 80, opacity: exit }}>
        <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 26 }}>
          <Kicker>Smart Search</Kicker>
          <Headline text="Just ask." size={140} align="left" />
          <Body delay={30} align="left" size={42}>
            Ask anything about Destiny in your own words, and get a real answer in seconds.
          </Body>
        </div>
        <div style={{ opacity: enter, translate: `${(1 - enter) * 140}px 0px` }}>
          <Browser width={W}>
            <div style={{ position: "absolute", inset: 0, scale: String(zoom), transformOrigin: "50% 90%" }}>
              <Img src={staticFile("site/search-open.jpg")} style={{ position: "absolute", width: W, height: H }} />
              <Img src={staticFile("site/search-typed.jpg")} style={{ position: "absolute", width: W, height: H, opacity: typed }} />
              <Img src={staticFile("site/search-answer.jpg")} style={{ position: "absolute", width: W, height: H, opacity: answer }} />
            </div>
          </Browser>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

/** Shared layout: headline on top, a scrolling page underneath. */
const PageScene: React.FC<{ kicker: string; title: string; body: string; src: string; aspect: number; scrollTo: number; accent?: string[] }> = ({
  kicker,
  title,
  body,
  src,
  aspect,
  scrollTo,
  accent,
}) => {
  const enter = useProgress(6, 40);
  const exit = useExit(12);
  const W = 1280;
  return (
    <Dark>
      <Glow intensity={0.28} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 100, opacity: exit }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ height: 16 }} />
        <Headline text={title} size={88} accent={accent} />
        <div style={{ height: 14 }} />
        <Body delay={20} size={40}>
          {body}
        </Body>
        <div style={{ position: "absolute", top: 420, opacity: enter, translate: `0px ${(1 - enter) * 200}px` }}>
          <Browser width={W}>
            <Shot src={src} frameWidth={W} frameHeight={W * DESKTOP} imageAspect={aspect} scrollFrom={0} scrollTo={scrollTo} start={40} duration={130} />
          </Browser>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

export const SermonsScene: React.FC = () => (
  <PageScene kicker="Sermons" title="Every message. Watch or listen." body="The latest Sunday, the full archive, and search that finds the one you remember." src="site/sermons-cut.jpg" aspect={4805 / 2880} scrollTo={0.42} accent={["listen"]} />
);

export const WhatsOnScene: React.FC = () => (
  <PageScene kicker="What's On" title="Never miss what's on." body="Every event and course in one place, with sign up, maps and a calendar invite." src="site/whatson-full.jpg" aspect={FULL} scrollTo={0.2} />
);

export const VisitScene: React.FC = () => (
  <PageScene kicker="Plan your visit" title="Your first Sunday, sorted." body="Service times, parking and what to expect, before you walk through the doors." src="site/visit-full.jpg" aspect={FULL} scrollTo={0.18} accent={["sorted"]} />
);

// 8. Ministries grid
const tiles: { src: string; label: string }[] = [
  { src: "site/kids.jpg", label: "Destiny Kids" },
  { src: "site/youth.jpg", label: "Destiny Youth" },
  { src: "site/youngadults.jpg", label: "Young Adults" },
  { src: "site/connect.jpg", label: "Connect Groups" },
  { src: "site/alpha.jpg", label: "Alpha" },
  { src: "site/serve.jpg", label: "Serve" },
  { src: "site/give.jpg", label: "Give" },
  { src: "site/shop.jpg", label: "Shop" },
];

export const MinistriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = useExit(12);
  const TW = 400;
  const TH = TW * DESKTOP;
  return (
    <Dark>
      <Glow intensity={0.25} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 100, opacity: exit }}>
        <Headline text="A place for every age and stage." size={88} accent={["every"]} />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${TW}px)`, gap: 34, marginTop: 80 }}>
          {tiles.map((t, i) => {
            const st = 18 + i * 6;
            const p = interpolate(frame, [st, st + 26], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={t.label} style={{ opacity: p, translate: `0px ${(1 - p) * 60}px`, scale: String(0.94 + 0.06 * p) }}>
                <div style={{ width: TW, height: TH, borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
                  <Img src={staticFile(t.src)} style={{ width: TW, height: TH }} />
                </div>
                <div style={{ fontFamily: roboto, fontWeight: 500, fontSize: 30, color: C.white, marginTop: 16, textAlign: "center" }}>{t.label}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

// 9. The little things
type Little = { kicker: string; title: string; src: string; mobile?: boolean };
const LittleThing: React.FC<Little & { index: number }> = ({ kicker, title, src, mobile, index }) => {
  const enter = useProgress(0, 22);
  const exit = useExit(8);
  const flip = index % 2 === 1;
  return (
    <AbsoluteFill style={{ background: C.ink, opacity: exit }}>
      <Glow intensity={0.22} colors={[[C.orange, C.blue, C.purple, C.green, C.red][index % 5]]} drift={2} />
      <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 110, padding: "0 120px" }}>
        <div style={{ width: 640, display: "flex", flexDirection: "column", gap: 22 }}>
          <Kicker>{kicker}</Kicker>
          <Headline text={title} size={76} align="left" delay={4} stagger={3} />
        </div>
        <div style={{ opacity: enter, translate: `${(flip ? -1 : 1) * (1 - enter) * 120}px 0px` }}>
          {mobile ? (
            <AppScreen src={src} height={820} aspect={MOBILE} />
          ) : (
            <Browser width={1000}>
              <Img src={staticFile(src)} style={{ width: 1000, height: 1000 * DESKTOP }} />
            </Browser>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const LITTLE_THINGS: Little[] = [
  { kicker: "Accessibility", title: "Reduce motion, readable text, and keyboard friendly throughout.", src: "site/accessibility.jpg" },
  { kicker: "Back of the seat", title: "Tap your phone on the seat for the Connect Card and giving.", src: "site/nfc-m.jpg", mobile: true },
  { kicker: "Song requests", title: "Pick the tunes at events. Clean songs only.", src: "site/songs-m.jpg", mobile: true },
  { kicker: "Talent show", title: "Vote for your favourite act from your seat.", src: "site/talent-m.jpg", mobile: true },
  { kicker: "Help centre", title: "Answers to the questions people actually ask.", src: "site/help.jpg" },
  { kicker: "Training", title: "Everything our serving teams need, in one place.", src: "site/training.jpg" },
  { kicker: "Governance", title: "Our charity and company records, live and open to all.", src: "site/governance.jpg" },
  { kicker: "Links", title: "One link for every next step.", src: "site/links-m.jpg", mobile: true },
];

export const LittleThingsTitle: React.FC = () => {
  const exit = useExit(8);
  return (
    <Dark>
      <Center style={{ opacity: exit }}>
        <Headline text="And all the little things." size={130} accent={["little"]} stagger={5} />
      </Center>
    </Dark>
  );
};

export const LittleThingSlide: React.FC<{ index: number }> = ({ index }) => <LittleThing {...LITTLE_THINGS[index]} index={index} />;

// 10. Every screen, iPhone Duo included
export const MobileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = useExit(12);
  const rise = (delay: number) => interpolate(frame, [delay + 10, delay + 50], [0, 1], { ...clamp, easing: ease });
  const duoH = 800;
  const duoW = duoH * (DUO_INNER.w / DUO_INNER.h);
  const outerH = 640;
  const outerW = outerH * (DUO_OUTER.w / DUO_OUTER.h);
  const a = rise(10);
  const b = rise(0);
  const c = rise(18);
  return (
    <Dark>
      <Glow intensity={0.35} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 80, opacity: exit }}>
        <Headline text="Beautiful on every screen. Even iPhone Duo." size={84} accent={["Duo"]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 70, paddingBottom: 40, opacity: exit }}>
        <div style={{ opacity: a, translate: `0px ${(1 - a) * 400}px` }}>
          <AppScreen src="site/home-m.jpg" height={700} aspect={MOBILE} />
        </div>
        <div style={{ opacity: b, translate: `0px ${(1 - b) * 400}px` }}>
          <Foldable height={duoH}>
            <ScreenImage src="site/duo-home.jpg" width={duoW} height={duoH} />
          </Foldable>
        </div>
        <div style={{ opacity: c, translate: `0px ${(1 - c) * 400}px` }}>
          <Foldable height={outerH} open={0}>
            <ScreenImage src="site/duo-outer-home.jpg" width={outerW} height={outerH} />
          </Foldable>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

// 11. The "finished" ending
export const WebsiteEndScene: React.FC = () => {
  const logo = useProgress(6, 34);
  const exit = useExit(30);
  return (
    <Dark bg="#000">
      <Center gap={44} style={{ opacity: exit }}>
        <div style={{ opacity: logo, filter: `blur(${(1 - logo) * 8}px)` }}>
          <Logo width={820} />
        </div>
        <div style={{ fontFamily: dosis, fontWeight: 600, fontSize: 44, letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase", opacity: useProgress(40, 24) }}>
          The new website
        </div>
      </Center>
    </Dark>
  );
};

// 12. One more thing
export const OneMoreThingScene: React.FC = () => {
  const exit = useExit(16);
  return (
    <Dark bg="#000">
      <Center style={{ opacity: exit }}>
        <Headline text="Oh, and one more thing." size={104} delay={10} stagger={7} />
      </Center>
    </Dark>
  );
};
