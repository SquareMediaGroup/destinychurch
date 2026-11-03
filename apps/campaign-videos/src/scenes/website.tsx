import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, dosis, roboto } from "../theme";
import { Body, Center, Headline, IPhone, Kicker, Logo, MacBook, Page, PunchIn, kf, macScreen, useExit, usePunch } from "../ui";

const W_FULL = 3024; // full-page captures are 3024px wide (1512pt @2x)
const aspect = (h: number) => h / W_FULL;

/** Content drifts up and out as the scene ends. */
const Exit: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 22 }) => {
  const e = useExit(frames);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -90}px` }}>{children}</AbsoluteFill>;
};

/** A device rising into place over `frames`, then holding still. */
const Rise: React.FC<{ children: React.ReactNode; delay?: number; distance?: number; frames?: number; style?: React.CSSProperties }> = ({ children, delay = 0, distance = 760, frames = 46, style }) => {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", translate: `0px ${kf(frame, [delay, delay + frames], [distance, 0])}px`, ...style }}>{children}</div>;
};

/** Title block at the top of a scene. */
const Title: React.FC<{ kicker?: string; title: string; body?: string; accent?: string[]; size?: number }> = ({ kicker, title, body, accent, size = 80 }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
    {kicker ? <Kicker>{kicker}</Kicker> : null}
    <div style={{ height: 12 }} />
    <Headline text={title} size={size} accent={accent} />
    {body ? (
      <>
        <div style={{ height: 10 }} />
        <Body delay={20} size={36}>
          {body}
        </Body>
      </>
    ) : null}
  </AbsoluteFill>
);

// 1. Logo + announcement
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = kf(frame, [4, 44], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={64}>
          <div style={{ opacity: logo, scale: String(0.9 + 0.1 * logo) }}>
            <Logo width={760} />
          </div>
          <Headline text="Introducing our new website." delay={34} size={100} accent={["new"]} />
        </Center>
      </Exit>
    </Page>
  );
};

// 2. Why it changed, in everyday words: one reason per screen.
const REASONS: { kicker: string; title: string; body: string }[] = [
  {
    kicker: "Easier for everyone",
    title: "Easier for everyone to use.",
    body: "Text that is easier to read, calmer movement on screen for anyone who finds it hard, and every page works with just a keyboard.",
  },
  {
    kicker: "Easier to find things",
    title: "Find what you need, fast.",
    body: "Service times, events and sermons are a tap away. Or just type a question in your own words, and the website answers.",
  },
  {
    kicker: "Much quicker",
    title: "Pages open in a flash.",
    body: "The new website loads over three times faster on a phone, and uses far less of your mobile data.",
  },
  {
    kicker: "A fresh new look",
    title: "Looks and feels like Destiny.",
    body: "A clean, modern design built around our church, our people and our colours.",
  },
];

export const WhyTitleScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={30}>
        <Headline text="Why a new website?" size={120} stagger={5} />
        <Body delay={30} size={46}>
          Four reasons, and what they mean for you.
        </Body>
      </Center>
    </Exit>
  </Page>
);

export const WhyReasonScene: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const r = REASONS[index];
  const num = kf(frame, [0, 40], [0, 1]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 110, padding: "0 160px" }}>
          <div
            style={{
              fontFamily: roboto,
              fontWeight: 700,
              fontSize: 360,
              letterSpacing: "-0.06em",
              color: C.accent,
              lineHeight: 1,
              opacity: num,
              translate: `0px ${(1 - num) * 120}px`,
            }}
          >
            {index + 1}
          </div>
          <div style={{ width: 1000, display: "flex", flexDirection: "column", gap: 26 }}>
            <Kicker delay={6}>{r.kicker}</Kicker>
            <Headline text={r.title} size={96} align="left" delay={10} />
            <Body delay={30} size={44} align="left" color={C.ink} maxWidth={980}>
              {r.body}
            </Body>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 3. Before and after: the old WordPress page wipes away to the new one.
const Pill: React.FC<{ text: string; side: "left" | "right"; visible: number }> = ({ text, side, visible }) => (
  <div
    style={{
      position: "absolute",
      bottom: 20,
      [side]: 20,
      padding: "8px 18px",
      borderRadius: 999,
      background: "rgba(29,29,31,0.8)",
      color: C.white,
      fontFamily: dosis,
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      opacity: visible,
    }}
  >
    {text}
  </div>
);

export const BeforeAfter: React.FC<{ name: string; title: string; first?: boolean }> = ({ name, title, first }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const W = 1140;
  const { w, h } = macScreen(W);
  const start = first ? 60 : 30;
  const wipe = kf(frame, [start, start + 48], [0, 1]);
  return (
    <Page>
      <Exit>
        <Title kicker={first ? "Before and after" : undefined} title={title} size={first ? 88 : 72} />
        <Rise delay={0} distance={first ? 760 : 0} style={{ left: 960 - W / 2, top: 250 }}>
          <MacBook src={`site/new-${name}.jpg`} width={W}>
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${wipe * 100}%)` }}>
              <Img src={staticFile(`site/old-${name}.jpg`)} style={{ position: "absolute", width: w, height: h }} />
              <Pill text="Before" side="right" visible={1 - kf(frame, [start + 30, start + 44], [0, 1])} />
            </div>
            <Pill text="After" side="left" visible={kf(frame, [start + 34, start + 50], [0, 1]) * kf(frame, [durationInFrames - 30, durationInFrames - 20], [1, 0])} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 3, marginLeft: -1.5, background: C.white, opacity: wipe > 0.01 && wipe < 0.99 ? 1 : 0 }} />
          </MacBook>
        </Rise>
      </Exit>
    </Page>
  );
};

/** The same before/after on two phones side by side. */
export const BeforeAfterPhones: React.FC = () => {
  const frame = useCurrentFrame();
  const a = kf(frame, [0, 46], [760, 0]);
  const b = kf(frame, [16, 62], [760, 0]);
  return (
    <Page>
      <Exit>
        <Title title="And on your phone." size={80} />
        <div style={{ position: "absolute", left: 960 - 420, top: 230, display: "flex", gap: 90 }}>
          <div style={{ translate: `0px ${a}px`, textAlign: "center" }}>
            <IPhone src="site/old-home-m.jpg" height={700} color="black" />
            <div style={{ fontFamily: dosis, fontWeight: 700, fontSize: 24, letterSpacing: "0.18em", color: C.muted, marginTop: 18 }}>BEFORE</div>
          </div>
          <div style={{ translate: `0px ${b}px`, textAlign: "center" }}>
            <IPhone src="site/new-home-m.jpg" height={700} />
            <div style={{ fontFamily: dosis, fontWeight: 700, fontSize: 24, letterSpacing: "0.18em", color: C.accent, marginTop: 18 }}>AFTER</div>
          </div>
        </div>
      </Exit>
    </Page>
  );
};

// 4. Performance, as plain comparisons with bars. Figures: Google Lighthouse, mobile, median of three
// runs on each home page (3 Nov 2026): main content 7.3 s → 2.1 s, page weight 13.7 MB → 0.8 MB,
// accessibility 71 → 96.
type Bar = { label: string; value: number; note?: string; isNew?: boolean };
const CHARTS: { title: string; bars: Bar[] }[] = [
  {
    title: "How fast the page loads on a phone",
    bars: [
      { label: "New website", value: 1, isNew: true },
      { label: "Old website", value: 2.1 / 7.3, note: "3.5× slower" },
    ],
  },
  {
    title: "Mobile data used to open the home page",
    bars: [
      { label: "Old website", value: 1, note: "13.7 MB" },
      { label: "New website", value: 0.8 / 13.7, note: "94% less", isNew: true },
    ],
  },
  {
    title: "Accessibility score",
    bars: [
      { label: "New website", value: 0.96, note: "96 / 100", isNew: true },
      { label: "Old website", value: 0.71, note: "71 / 100" },
    ],
  },
];

const BarRow: React.FC<{ bar: Bar; start: number }> = ({ bar, start }) => {
  const frame = useCurrentFrame();
  const grow = kf(frame, [start, start + 46], [0, bar.value]);
  const label = kf(frame, [start + 30, start + 50], [0, 1]);
  return (
    <div style={{ marginTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: roboto, fontSize: 34 }}>
        <span style={{ fontWeight: 600, color: bar.isNew ? C.ink : C.muted }}>{bar.label}</span>
        <span style={{ fontWeight: 600, color: bar.isNew ? C.accent : C.muted, opacity: label }}>{bar.note ?? ""}</span>
      </div>
      <div style={{ height: 14, borderRadius: 7, background: "rgba(0,0,0,0.06)", marginTop: 14, overflow: "hidden" }}>
        <div
          style={{
            width: `${grow * 100}%`,
            height: "100%",
            borderRadius: 7,
            background: bar.isNew ? `linear-gradient(90deg, ${C.orange}, #FD0000 55%, #8106B1)` : "#B9B9BE",
          }}
        />
      </div>
    </div>
  );
};

export const PerformanceScene: React.FC<{ chart: number }> = ({ chart }) => {
  const frame = useCurrentFrame();
  const c = CHARTS[chart];
  return (
    <Page bg={C.white}>
      <Exit>
        <AbsoluteFill style={{ justifyContent: "center", padding: "0 260px" }}>
          {chart === 0 ? <Kicker>Much quicker</Kicker> : null}
          <div style={{ height: 16 }} />
          <Headline text={c.title} size={76} align="left" />
          <div style={{ height: 30 }} />
          {c.bars.map((b, i) => (
            <BarRow key={b.label} bar={b} start={34 + i * 18} />
          ))}
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 260px 70px" }}>
          <div style={{ fontFamily: roboto, fontSize: 22, color: C.muted, opacity: kf(frame, [60, 90], [0, 1]) }}>
            Measured with Google Lighthouse on a simulated phone: each home page, middle result of three runs, November 2026.
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

/** Headline on top, MacBook below; the page scrolls down in eased steps, holding at each stop. */
const ScrollScene: React.FC<{ kicker: string; title: string; body: string; src: string; srcHeight: number; stops: number[]; accent?: string[] }> = ({
  kicker,
  title,
  body,
  src,
  srcHeight,
  stops,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // One move per stop, spread evenly, each 40 frames with a hold after it.
  const span = (durationInFrames - 90) / stops.length;
  const input: number[] = [50];
  const output: number[] = [0];
  stops.forEach((s, i) => {
    input.push(50 + i * span + 40, 50 + (i + 1) * span);
    output.push(s, s);
  });
  const scroll = kf(frame, input, output);
  const W = 1040;
  return (
    <Page>
      <Exit>
        <Title kicker={kicker} title={title} body={body} accent={accent} size={76} />
        <Rise delay={4} style={{ left: 960 - W / 2, top: 320 }}>
          <MacBook src={src} width={W} sourceAspect={aspect(srcHeight)} scroll={scroll} />
        </Rise>
      </Exit>
    </Page>
  );
};

export const HomeScroll: React.FC = () => (
  <ScrollScene kicker="All new" title="Made for everyone who walks through our doors." body="What's on, the latest message, and your next step, all on the home page." src="site/home-full.jpg" srcHeight={10320} stops={[0.12, 0.3, 0.52]} />
);

export const SermonsScene: React.FC = () => (
  <ScrollScene kicker="Sermons" title="Every message. Watch or listen." body="The latest Sunday, the full archive, and search that finds the one you remember." src="site/sermons-full.jpg" srcHeight={11296} stops={[0.12, 0.3, 0.55]} accent={["listen"]} />
);

export const WhatsOnScene: React.FC = () => (
  <ScrollScene kicker="What's On" title="Never miss what's on." body="Every event and course in one place, with sign up, maps and a calendar invite." src="site/whatson-full.jpg" srcHeight={12000} stops={[0.06, 0.24, 0.42]} />
);

export const VisitScene: React.FC = () => (
  <ScrollScene kicker="Plan your visit" title="Your first Sunday, sorted." body="Service times, parking, what happens in the service, kids, and the questions people ask." src="site/visit-full.jpg" srcHeight={12000} stops={[0.1, 0.32, 0.58]} accent={["sorted"]} />
);

// 5. Smart Search, typed out, then the answer, then a punch in on it.
export const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1180;
  const { w, h } = macScreen(W);
  // Six typing frames, a beat, then the answer.
  const step = Math.min(6, Math.max(1, Math.floor((frame - 46) / 7) + 1));
  const answered = frame > 46 + 6 * 7 + 18;
  const src = answered ? "site/ss-answer.jpg" : `site/ss-type-${step}.jpg`;
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 60 }}>
          <div style={{ width: 500, display: "flex", flexDirection: "column", gap: 24, opacity: 1 - usePunch(150, 70) }}>
            <Kicker>Smart Search</Kicker>
            <Headline text="Just ask." size={130} align="left" />
            <Body delay={26} align="left" size={38}>
              Ask anything about Destiny in your own words. Smart Search answers, and points you to the right page.
            </Body>
          </div>
          <div style={{ position: "relative", width: W, height: W * (2540 / 3860) }}>
            <Rise delay={0} distance={800}>
              <PunchIn at={150} hold={70} zoom={2.1} x={0.5} y={0.83}>
                <MacBook src="site/ss-type-1.jpg" width={W}>
                  <Img src={staticFile(src)} style={{ position: "absolute", width: w, height: h }} />
                </MacBook>
              </PunchIn>
            </Rise>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

/** The same on a phone: "How do I get baptised?", and an answer with a button to the right page. */
export const SearchPhoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.min(6, Math.max(1, Math.floor((frame - 40) / 6) + 1));
  const answered = frame > 40 + 6 * 6 + 16;
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 140 }}>
          <div style={{ width: 720, display: "flex", flexDirection: "column", gap: 24, opacity: 1 - usePunch(110, 60) }}>
            <Kicker>Smart Search</Kicker>
            <Headline text="From a question to the next step." size={84} align="left" />
            <Body delay={24} align="left" size={38}>
              Ask how to get baptised, and the answer comes with a button straight to sign up.
            </Body>
          </div>
          <div style={{ position: "relative", width: 400, height: 820 }}>
            <Rise delay={0} distance={860}>
              <PunchIn at={110} hold={60} zoom={1.7} x={0.4} y={0.72}>
                <IPhone src={answered ? "site/ss-m-answer.jpg" : `site/ss-m-type-${step}.jpg`} height={820} />
              </PunchIn>
            </Rise>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 6. The shop has moved
export const ShopMoveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const swap = kf(frame, [70, 110], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={40}>
          <Kicker>Shop</Kicker>
          <Headline text="Our shop has moved home." size={100} />
          <div style={{ height: 30 }} />
          <div style={{ position: "relative", height: 90, width: 1200, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: roboto, fontWeight: 500, fontSize: 72, color: C.muted, translate: `0px ${-swap * 100}%`, textDecoration: "line-through", textDecorationThickness: 4 }}>
              shop.destinytees.uk
            </div>
            <div style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: roboto, fontWeight: 700, fontSize: 72, color: C.accent, translate: `0px ${(1 - swap) * 100}%` }}>destinytees.uk/shop</div>
          </div>
        </Center>
      </Exit>
    </Page>
  );
};

export const ShopBeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1140;
  const { w, h } = macScreen(W);
  const wipe = kf(frame, [36, 84], [0, 1]);
  const scroll = kf(frame, [110, 160], [0, 0.42]);
  return (
    <Page>
      <Exit>
        <Title title="A much better shop." size={80} accent={["better"]} />
        <Rise delay={0} style={{ left: 960 - W / 2, top: 240 }}>
          <MacBook src="site/shop-full.jpg" width={W} sourceAspect={aspect(6302)} scroll={scroll}>
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${wipe * 100}%)` }}>
              <Img src={staticFile("site/old-shop.jpg")} style={{ position: "absolute", width: w, height: h }} />
              <Pill text="Before" side="right" visible={1 - kf(frame, [66, 80], [0, 1])} />
            </div>
            <Pill text="After" side="left" visible={kf(frame, [70, 86], [0, 1])} />
          </MacBook>
        </Rise>
      </Exit>
    </Page>
  );
};

/** Product page, punch in on Add to basket, then checkout without leaving the site. */
export const ShopCheckoutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1120;
  const { w, h } = macScreen(W);
  const toCheckout = kf(frame, [150, 162], [0, 1]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 60 }}>
          <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 24, opacity: 1 - usePunch(60, 50) }}>
            <Kicker>Checkout</Kicker>
            <Headline text="Pay without leaving the site." size={84} align="left" />
            <Body delay={24} align="left" size={38}>
              Apple Pay, card and more, right on the page. Collect your order on a Sunday.
            </Body>
          </div>
          <div style={{ position: "relative", width: W, height: W * (2540 / 3860) }}>
            <Rise delay={0} distance={800}>
              <PunchIn at={60} hold={50} zoom={1.9} x={0.72} y={0.56}>
                <MacBook src="site/shop-product.jpg" width={W}>
                  <Img src={staticFile("site/shop-checkout.jpg")} style={{ position: "absolute", width: w, height: h, opacity: toCheckout }} />
                </MacBook>
              </PunchIn>
            </Rise>
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 7. Ministries grid
const tiles: { src: string; label: string }[] = [
  { src: "site/kids.jpg", label: "Destiny Kids" },
  { src: "site/youth.jpg", label: "Destiny Youth" },
  { src: "site/youngadults.jpg", label: "Young Adults" },
  { src: "site/connect.jpg", label: "Connect Groups" },
  { src: "site/alpha.jpg", label: "Alpha" },
  { src: "site/serve.jpg", label: "Serve" },
  { src: "site/give.jpg", label: "Give" },
  { src: "site/visit.jpg", label: "Plan your visit" },
];

export const MinistriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const TW = 380;
  const TH = TW * (982 / 1512);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
          <Headline text="A place for every age and stage." size={80} accent={["every"]} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${TW}px)`, gap: 32, marginTop: 80 }}>
            {tiles.map((t, i) => {
              const p = kf(frame, [20 + i * 6, 64 + i * 6], [0, 1]);
              return (
                <div key={t.label} style={{ opacity: p, translate: `0px ${(1 - p) * 140}px` }}>
                  <div style={{ width: TW, height: TH, borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 36px rgba(0,0,0,0.1)" }}>
                    <Img src={staticFile(t.src)} style={{ width: TW, height: TH }} />
                  </div>
                  <div style={{ fontFamily: roboto, fontWeight: 500, fontSize: 28, color: C.ink, marginTop: 14, textAlign: "center" }}>{t.label}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 8. The little things
type Little = { kicker: string; title: string; src: string; mobile?: boolean };
export const LITTLE_THINGS: Little[] = [
  { kicker: "Accessibility", title: "Reduce motion, readable text, and keyboard friendly throughout.", src: "site/accessibility.jpg" },
  { kicker: "Back of the seat", title: "Tap your phone on the seat for the Connect Card and giving.", src: "site/nfc-m.jpg", mobile: true },
  { kicker: "Help centre", title: "Answers to the questions people actually ask.", src: "site/help.jpg" },
  { kicker: "Training", title: "Everything our serving teams need, in one place.", src: "site/training.jpg" },
  { kicker: "Governance", title: "Our charity and company records, live and open to all.", src: "site/governance.jpg" },
  { kicker: "Links", title: "One link for every next step.", src: "site/links-m.jpg", mobile: true },
];

export const LittleThingSlide: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { kicker, title, src, mobile } = LITTLE_THINGS[index];
  const flip = index % 2 === 1;
  const slide = kf(frame, [0, 34], [flip ? -700 : 700, 0]);
  return (
    <Page>
      <Exit frames={14}>
        <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 110, padding: "0 140px" }}>
          <div style={{ width: 600, display: "flex", flexDirection: "column", gap: 20 }}>
            <Kicker>{kicker}</Kicker>
            <Headline text={title} size={66} align="left" delay={4} stagger={3} />
          </div>
          <div style={{ translate: `${slide}px 0px` }}>{mobile ? <IPhone src={src} height={800} /> : <MacBook src={src} width={980} />}</div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

export const LittleThingsTitle: React.FC = () => (
  <Page bg={C.white}>
    <Exit frames={14}>
      <Center>
        <Headline text="And all the little things." size={124} accent={["little"]} stagger={5} />
      </Center>
    </Exit>
  </Page>
);

// 9. Every screen
export const DevicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const left = kf(frame, [22, 66], [760, 0]);
  const right = kf(frame, [30, 74], [760, 0]);
  return (
    <Page>
      <Exit>
        <Title title="Beautiful on every screen." size={86} />
        <Rise delay={6} style={{ left: 960 - 560, top: 240 }}>
          <MacBook src="site/home.jpg" width={1120} />
        </Rise>
        <div style={{ position: "absolute", left: 170, top: 460, translate: `0px ${left}px` }}>
          <IPhone src="site/search-answer-m.jpg" height={540} />
        </div>
        <div style={{ position: "absolute", right: 170, top: 460, translate: `0px ${right}px` }}>
          <IPhone src="site/sermons-m.jpg" height={540} color="black" />
        </div>
      </Exit>
    </Page>
  );
};

// 10. The "finished" ending
export const WebsiteEndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = kf(frame, [6, 46], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit frames={30}>
        <Center gap={40}>
          <div style={{ opacity: logo, scale: String(0.92 + 0.08 * logo) }}>
            <Logo width={820} />
          </div>
          <div style={{ fontFamily: dosis, fontWeight: 600, fontSize: 42, letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase", opacity: kf(frame, [40, 70], [0, 1]) }}>
            The new website
          </div>
        </Center>
      </Exit>
    </Page>
  );
};

// 11. One more thing
export const OneMoreThingScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center>
        <Headline text="Oh, and one more thing." size={104} delay={10} stagger={7} />
      </Center>
    </Exit>
  </Page>
);
