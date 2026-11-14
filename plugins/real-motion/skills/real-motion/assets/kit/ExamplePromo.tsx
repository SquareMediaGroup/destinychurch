// Real Motion: an example SaaS promo, ~40 s at 1920x1080. Copy it, then replace the words and the
// screenshots (public/promo/*.png, real captures of the product) and retime the scenes.
//
// Story: hook → the problem → the product appears → three features, each shown in the real UI →
// proof → call to action. Each scene leaves with its own eased move, so the crossfades are short.
import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BrowserFrame, PhoneFrame } from "./frames";
import { C, F, FPS } from "./theme";
import { Body, Center, CountUp, Cursor, Enter, Exit, Headline, Highlight, Kicker, Page, PunchIn, Rise, Stagger, Typewriter, WordSwap, kf, usePunch } from "./motion";

const X = 8; // crossfade frames between scenes

/** 1. Hook: one bold line, one word that keeps changing. */
const Hook: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={20}>
        <Headline text="Ship work your team" size={140} />
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 140, letterSpacing: "-0.035em", color: C.ink, lineHeight: 1.05 }}>
          <WordSwap words={["trusts.", "loves.", "finishes."]} delay={18} every={30} />
        </div>
      </Center>
    </Exit>
  </Page>
);

/** 2. Problem: the pain, said plainly. */
const Problem: React.FC = () => (
  <Page>
    <Exit>
      <Center gap={30}>
        <Kicker>The problem</Kicker>
        <Headline text="Updates live in twelve different tabs." size={100} accent={["twelve"]} />
        <Body delay={26}>Nobody knows what's done, what's late, or who has it.</Body>
      </Center>
    </Exit>
  </Page>
);

/** 3. Reveal: the product rises into place, then the camera punches in on the part that matters. */
const Reveal: React.FC = () => {
  const fade = 1 - usePunch(70, 50);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
          <div style={{ opacity: fade }}>
            <Headline text="Meet Acme Boards." size={96} accent={["Acme"]} />
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end" }}>
          <Rise delay={6} distance={900}>
            <PunchIn at={70} hold={50} zoom={1.9} x={0.3} y={0.35}>
              <BrowserFrame src="promo/app.png" width={1500} url="app.acme.com" style={{ marginBottom: -120 }} />
            </PunchIn>
          </Rise>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

/** 4. A feature: copy on the left, the real UI on the right with a cursor doing the thing. */
const Feature: React.FC<{ kicker: string; title: string; body: string; src: string }> = ({ kicker, title, body, src }) => (
  <Page>
    <Exit>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 70 }}>
        <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 24 }}>
          <Kicker>{kicker}</Kicker>
          <Headline text={title} size={88} align="left" />
          <Body delay={24} align="left" size={36}>
            {body}
          </Body>
        </div>
        <Rise delay={4} distance={700}>
          <div style={{ position: "relative" }}>
            <BrowserFrame src={src} width={1050}>
              <Highlight x={0.06} y={0.2} w={0.42} h={0.14} delay={40} />
              <Cursor
                path={[
                  { at: 0, x: 820, y: 560 },
                  { at: 40, x: 300, y: 150, click: true },
                ]}
              />
            </BrowserFrame>
          </div>
        </Rise>
      </AbsoluteFill>
    </Exit>
  </Page>
);

/** 5. Mobile: the same product on a phone, with something typed. */
const Mobile: React.FC = () => (
  <Page>
    <Exit>
      <AbsoluteFill style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 140 }}>
        <div style={{ width: 640, display: "flex", flexDirection: "column", gap: 24 }}>
          <Kicker>On the go</Kicker>
          <Headline text="Reply from anywhere." size={92} align="left" />
          <div style={{ fontFamily: F.body, fontSize: 38, color: C.ink, background: C.white, borderRadius: 18, padding: "18px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            <Typewriter text="Looks great, ship it." delay={30} />
          </div>
        </div>
        <Rise distance={900}>
          <PhoneFrame src="promo/phone.png" height={900} />
        </Rise>
      </AbsoluteFill>
    </Exit>
  </Page>
);

/** 6. Proof: numbers that count up, in a row. */
const Proof: React.FC = () => {
  const stat = (to: number, suffix: string, label: string, decimals = 0) => (
    <div style={{ width: 480, textAlign: "center" }}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 112, letterSpacing: "-0.04em", color: C.ink, whiteSpace: "nowrap" }}>
        <CountUp to={to} suffix={suffix} decimals={decimals} delay={10} />
      </div>
      <div style={{ fontFamily: F.body, fontSize: 34, color: C.muted }}>{label}</div>
    </div>
  );
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={60}>
          <Kicker>Teams ship faster</Kicker>
          <Stagger every={8} style={{ gap: 60 }}>{[stat(12000, "+", "teams"), stat(38, "%", "fewer status meetings"), stat(4.9, "/5", "average rating", 1)]}</Stagger>
        </Center>
      </Exit>
    </Page>
  );
};

/** 7. Call to action: the name, the promise, where to go. Holds still at the end. */
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.dark}>
      <Center gap={34}>
        <Headline text="Acme Boards." size={150} color={C.white} />
        <Enter delay={22}>
          <div style={{ fontFamily: F.body, fontSize: 42, color: "rgba(255,255,255,0.7)" }}>Free for teams up to 10.</div>
        </Enter>
        <div
          style={{
            marginTop: 20,
            padding: "22px 44px",
            borderRadius: 999,
            background: C.accentBright,
            color: C.white,
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 40,
            opacity: kf(frame, [40, 62], [0, 1]),
            scale: String(kf(frame, [40, 62], [0.9, 1])),
          }}
        >
          acme.com
        </div>
      </Center>
    </Page>
  );
};

/** Register as <Composition id="ExamplePromo" component={ExamplePromo} durationInFrames={EXAMPLE_PROMO_FRAMES} fps={30} width={1920} height={1080} />. */
export const SCENES: [string, number, React.ReactNode][] = [
  ["Hook", 3.4, <Hook key="hook" />],
  ["Problem", 4, <Problem key="problem" />],
  ["Reveal", 6, <Reveal key="reveal" />],
  ["Feature: plan", 5, <Feature key="f1" kicker="Plan" title="Everything in one board." body="Every project, owner and date on one screen." src="promo/feature-1.png" />],
  ["Feature: automate", 5, <Feature key="f2" kicker="Automate" title="Updates write themselves." body="Status rolls up from the work, not from meetings." src="promo/feature-2.png" />],
  ["Mobile", 5, <Mobile key="mobile" />],
  ["Proof", 4.5, <Proof key="proof" />],
  ["CTA", 4, <Cta key="cta" />],
];

export const EXAMPLE_PROMO_FRAMES = SCENES.reduce((t, [, s]) => t + Math.round(s * FPS), 0) - X * (SCENES.length - 1);

export const ExamplePromo: React.FC = () => (
  <AbsoluteFill style={{ background: C.page }}>
    <TransitionSeries>
      {SCENES.flatMap(([name, seconds, el], i) => [
        ...(i ? [<TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: X })} />] : []),
        <TransitionSeries.Sequence key={name} name={name} durationInFrames={Math.round(seconds * FPS)}>
          {el}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  </AbsoluteFill>
);
