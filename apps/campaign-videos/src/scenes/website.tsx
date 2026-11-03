import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, anton, dosis, roboto } from "../theme";
import { Body, Center, Headline, IPhone, Kicker, Logo, MacBook, Page, RevealText, kf, macScreen, useExit } from "../ui";

const FULL = 7400 / 3024; // full-page captures, cropped to 3024 x 7400

/** Content leaves by drifting up as the scene ends. */
const Exit: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 16 }) => {
  const e = useExit(frames);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -80}px` }}>{children}</AbsoluteFill>;
};

/** A device rising into place, then holding. */
const useRise = (start: number, distance = 700) => {
  const frame = useCurrentFrame();
  return { translate: `0px ${kf(frame, [start, start + 34], [distance, 0])}px` };
};

// 1. Cold open
export const OpenScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center>
        <RevealText text="Welcome home." delay={10} stagger={8} style={{ fontFamily: anton, fontSize: 230, color: C.ink, textTransform: "uppercase" }} />
        <Body delay={40} size={50}>
          Make real friends. Find real purpose.
        </Body>
      </Center>
    </Exit>
  </Page>
);

// 2. Logo + announcement
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = kf(frame, [2, 30], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={60}>
          <div style={{ opacity: logo, scale: String(0.9 + 0.1 * logo) }}>
            <Logo width={760} />
          </div>
          <Headline text="Introducing our new website." delay={26} size={96} accent={["new"]} />
        </Center>
      </Exit>
    </Page>
  );
};

// 3. Before and after: the old destinytees.uk home page wipes away to the new one.
export const BeforeAfterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1500;
  const { w, h } = macScreen(W);
  const wipe = kf(frame, [52, 96], [0, 1]);
  const pill = (text: string, side: "left" | "right", visible: number) => (
    <div
      style={{
        position: "absolute",
        bottom: 22,
        [side]: 22,
        padding: "8px 20px",
        borderRadius: 999,
        background: "rgba(29,29,31,0.78)",
        color: C.white,
        fontFamily: dosis,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        opacity: visible,
      }}
    >
      {text}
    </div>
  );
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 90 }}>
          <Headline text="A fresh new look." size={96} accent={["new"]} />
          <div style={{ position: "absolute", top: 230, ...useRise(0) }}>
            <MacBook src="site/home.jpg" width={W}>
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${wipe * 100}%)` }}>
                <Img src={staticFile("site/old-home.jpg")} style={{ position: "absolute", width: w, height: h }} />
                {pill("Before", "right", 1 - kf(frame, [80, 92], [0, 1]))}
              </div>
              {pill("After", "left", kf(frame, [84, 98], [0, 1]))}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 3, marginLeft: -1.5, background: C.white, opacity: wipe > 0.01 && wipe < 0.99 ? 1 : 0 }} />
            </MacBook>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 4. Hero: the MacBook rises, then the page scrolls a little.
export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 100 }}>
          <Kicker>All new</Kicker>
          <div style={{ height: 14 }} />
          <Headline text="Made for everyone who walks through our doors." delay={6} size={76} />
          <div style={{ position: "absolute", top: 330, ...useRise(4, 800) }}>
            <MacBook src="site/home-full.jpg" width={1560} sourceAspect={FULL} scroll={kf(frame, [60, 130], [0, 0.1])} />
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 5. Smart Search: question typed, answer appears, then a push in on the answer.
export const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1220;
  const { w, h } = macScreen(W);
  const typed = kf(frame, [64, 72], [0, 1]);
  const answer = kf(frame, [110, 120], [0, 1]);
  const zoom = kf(frame, [128, 168], [1, 1.75]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 100px", gap: 70 }}>
          <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 24 }}>
            <Kicker>Smart Search</Kicker>
            <Headline text="Just ask." size={140} align="left" />
            <Body delay={26} align="left" size={40}>
              Ask anything about Destiny in your own words, and get a real answer in seconds.
            </Body>
          </div>
          <div style={{ ...useRise(0, 900) }}>
            <MacBook src="site/search-open.jpg" width={W}>
              <div style={{ position: "absolute", inset: 0, scale: String(zoom), transformOrigin: "50% 86%" }}>
                <Img src={staticFile("site/search-open.jpg")} style={{ position: "absolute", width: w, height: h }} />
                <Img src={staticFile("site/search-typed.jpg")} style={{ position: "absolute", width: w, height: h, opacity: typed }} />
                <Img src={staticFile("site/search-answer.jpg")} style={{ position: "absolute", width: w, height: h, opacity: answer }} />
              </div>
            </MacBook>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

/** Headline on top, a MacBook below that rises in, then scrolls the page in two eased moves. */
const PageScene: React.FC<{ kicker: string; title: string; body: string; src: string; stops: [number, number]; accent?: string[] }> = ({ kicker, title, body, src, stops, accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = Math.round(durationInFrames * 0.55);
  const scroll = kf(frame, [36, 64, mid, mid + 28], [0, stops[0], stops[0], stops[1]]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 90 }}>
          <Kicker>{kicker}</Kicker>
          <div style={{ height: 14 }} />
          <Headline text={title} size={84} accent={accent} />
          <div style={{ height: 10 }} />
          <Body delay={18} size={38}>
            {body}
          </Body>
          <div style={{ position: "absolute", top: 400, ...useRise(4, 800) }}>
            <MacBook src={src} width={1440} sourceAspect={FULL} scroll={scroll} />
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

export const SermonsScene: React.FC = () => (
  <PageScene kicker="Sermons" title="Every message. Watch or listen." body="The latest Sunday, the full archive, and search that finds the one you remember." src="site/sermons-full.jpg" stops={[0.12, 0.33]} accent={["listen"]} />
);

export const WhatsOnScene: React.FC = () => (
  <PageScene kicker="What's On" title="Never miss what's on." body="Every event and course in one place, with sign up, maps and a calendar invite." src="site/whatson-full.jpg" stops={[0.1, 0.22]} />
);

export const VisitScene: React.FC = () => (
  <PageScene kicker="Plan your visit" title="Your first Sunday, sorted." body="Service times, parking and what to expect, before you walk through the doors." src="site/visit-full.jpg" stops={[0.1, 0.2]} accent={["sorted"]} />
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
  const TW = 400;
  const TH = TW * (982 / 1512);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 100 }}>
          <Headline text="A place for every age and stage." size={84} accent={["every"]} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${TW}px)`, gap: 34, marginTop: 80 }}>
            {tiles.map((t, i) => {
              const p = kf(frame, [14 + i * 4, 44 + i * 4], [0, 1]);
              return (
                <div key={t.label} style={{ opacity: p, translate: `0px ${(1 - p) * 120}px` }}>
                  <div style={{ width: TW, height: TH, borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.12)" }}>
                    <Img src={staticFile(t.src)} style={{ width: TW, height: TH }} />
                  </div>
                  <div style={{ fontFamily: roboto, fontWeight: 500, fontSize: 30, color: C.ink, marginTop: 16, textAlign: "center" }}>{t.label}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 9. The little things: quick cuts, alternating sides.
type Little = { kicker: string; title: string; src: string; mobile?: boolean };
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

export const LittleThingSlide: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { kicker, title, src, mobile } = LITTLE_THINGS[index];
  const flip = index % 2 === 1;
  const slide = kf(frame, [0, 22], [flip ? -600 : 600, 0]);
  return (
    <Page>
      <Exit frames={10}>
        <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 100, padding: "0 110px" }}>
          <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 20 }}>
            <Kicker>{kicker}</Kicker>
            <Headline text={title} size={72} align="left" delay={2} stagger={2} />
          </div>
          <div style={{ translate: `${slide}px 0px` }}>{mobile ? <IPhone src={src} height={860} /> : <MacBook src={src} width={1080} />}</div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

export const LittleThingsTitle: React.FC = () => (
  <Page bg={C.white}>
    <Exit frames={10}>
      <Center>
        <Headline text="And all the little things." size={130} accent={["little"]} stagger={4} />
      </Center>
    </Exit>
  </Page>
);

// 10. Every screen: MacBook with two iPhones in front of it.
export const DevicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const left = kf(frame, [16, 50], [700, 0]);
  const right = kf(frame, [22, 56], [700, 0]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 80 }}>
          <Headline text="Beautiful on every screen." size={92} />
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 960 - 650, top: 250, ...useRise(4, 800) }}>
          <MacBook src="site/home.jpg" width={1300} />
        </div>
        <div style={{ position: "absolute", left: 120, top: 420, translate: `0px ${left}px` }}>
          <IPhone src="site/search-answer-m.jpg" height={620} />
        </div>
        <div style={{ position: "absolute", right: 120, top: 420, translate: `0px ${right}px` }}>
          <IPhone src="site/sermons-m.jpg" height={620} color="black" />
        </div>
      </Exit>
    </Page>
  );
};

// 11. The "finished" ending
export const WebsiteEndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = kf(frame, [4, 34], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit frames={24}>
        <Center gap={40}>
          <div style={{ opacity: logo, scale: String(0.92 + 0.08 * logo) }}>
            <Logo width={820} />
          </div>
          <div style={{ fontFamily: dosis, fontWeight: 600, fontSize: 42, letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase", opacity: kf(frame, [30, 54], [0, 1]) }}>
            The new website
          </div>
        </Center>
      </Exit>
    </Page>
  );
};

// 12. One more thing
export const OneMoreThingScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center>
        <Headline text="Oh, and one more thing." size={104} delay={8} stagger={6} />
      </Center>
    </Exit>
  </Page>
);
