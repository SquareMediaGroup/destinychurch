import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, dosis, roboto } from "../theme";
import { AppIcon, Body, Center, Headline, IPhone, Kicker, Logo, Page, PunchIn, kf, useExit, usePunch } from "../ui";

const Exit: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 22 }) => {
  const e = useExit(frames);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -90}px` }}>{children}</AbsoluteFill>;
};

/** Text on one side; the phone rises in on the other. */
const Split: React.FC<{
  kicker: string;
  title: string;
  body: string;
  phone: React.ReactNode;
  flip?: boolean;
  accent?: string[];
  children?: React.ReactNode;
  /** The phone's punch in, so the text can step aside for it. */
  punch?: { at: number; hold: number };
}> = ({ kicker, title, body, phone, flip, accent, children, punch }) => {
  const frame = useCurrentFrame();
  // No punch in: a time past the end of any scene, so the text never steps aside.
  const away = usePunch(punch?.at ?? 100000, punch?.hold ?? 1);
  const rise = kf(frame, [0, 46], [900, 0]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 160 }}>
          <div style={{ width: 720, display: "flex", flexDirection: "column", gap: 24, opacity: 1 - away }}>
            <Kicker>{kicker}</Kicker>
            <Headline text={title} size={84} align="left" accent={accent} />
            {body ? (
              <Body delay={26} align="left" size={38}>
                {body}
              </Body>
            ) : null}
            {children}
          </div>
          <div style={{ translate: `0px ${rise}px` }}>{phone}</div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

// 13. Icon reveal
export const AppIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = kf(frame, [6, 50], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={44}>
          <div style={{ scale: String(0.4 + 0.6 * icon), opacity: icon }}>
            <AppIcon size={260} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 150, letterSpacing: "-0.04em", color: C.ink, translate: `0px ${kf(frame, [34, 68], [110, 0])}%` }}>Destiny One</div>
          </div>
          <Body delay={60} size={50}>
            Our church family, in your pocket.
          </Body>
        </Center>
      </Exit>
    </Page>
  );
};

export const ChatsScene: React.FC = () => (
  <Split
    kicker="Communities"
    title="Every team. Every group. One place."
    body="Announcements, ministries and Connect Groups, together in one tidy list."
    accent={["One"]}
    phone={<IPhone src="app/d1-chats.jpg" height={820} tabs />}
  />
);

/** The worship team chat, scrolled up through a poll, a sermon and replies in two eased moves. */
const ConversationPhone: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = Math.round(durationInFrames * 0.55);
  return <IPhone src="app/d1-group_g_worship-dark-tall.jpg" height={820} color="black" dark sourcePt={1500} scroll={kf(frame, [50, 90, mid, mid + 40], [0.3, 0.62, 0.62, 1])} />;
};

export const ConversationScene: React.FC = () => (
  <Split
    flip
    kicker="Chat"
    title="Polls, sermons and events, right in the chat."
    body="Vote on the setlist, share Sunday's message, and send the next event to the team."
    phone={<ConversationPhone />}
  />
);

/** DestinyAI, step by step: the question, the answer, then a follow-up that plays a sermon in the chat. */
const AiPhone: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = frame < 70 ? 1 : frame < 150 ? 2 : 3;
  return (
    <PunchIn at={190} hold={60} zoom={1.6} x={0.5} y={0.5}>
      <IPhone src={`app/d1-ai-${stage}.jpg`} height={820} />
    </PunchIn>
  );
};

export const AiScene: React.FC = () => (
  <Split
    kicker="DestinyAI · Beta"
    title="Ask DestinyAI anything about Destiny."
    body="What's on this week, service times, or last Sunday's message, played right in the chat."
    accent={["DestinyAI"]}
    punch={{ at: 190, hold: 60 }}
    phone={<AiPhone />}
  />
);

// Make it yours: three phones, light and dark.
export const AppearanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const phones: { src: string; x: number; delay: number; dark: boolean; tabs: boolean; color: "silver" | "black" }[] = [
    { src: "app/d1-chats.jpg", x: -470, delay: 8, dark: false, tabs: true, color: "silver" },
    { src: "app/d1-appearance-dark.jpg", x: 0, delay: 0, dark: true, tabs: false, color: "black" },
    { src: "app/d1-chats-dark.jpg", x: 470, delay: 14, dark: true, tabs: true, color: "black" },
  ];
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 80 }}>
          <Headline text="Light, dark or true dark. Make it yours." size={80} accent={["yours"]} />
        </AbsoluteFill>
        {phones.map((p) => (
          <div key={p.src} style={{ position: "absolute", left: 960 + p.x - 186, top: 250, translate: `0px ${kf(frame, [p.delay, p.delay + 46], [800, 0])}px` }}>
            <IPhone src={p.src} height={760} dark={p.dark} tabs={p.tabs} color={p.color} />
          </div>
        ))}
      </Exit>
    </Page>
  );
};

// Safe by design. The copy on screen is the app's own; the lines below mirror the rules the server enforces.
export const SafetyScene: React.FC = () => (
  <Split
    kicker="Safe by design"
    title="Built for church, with safeguarding at its heart."
    body="Every group has at least two adults, and our safeguarding team can step in if something doesn't look right."
    accent={["safeguarding"]}
    punch={{ at: 90, hold: 60 }}
    phone={
      <PunchIn at={90} hold={60} zoom={1.7} x={0.5} y={0.22}>
        <IPhone src="app/d1-chat-safety.jpg" height={820} />
      </PunchIn>
    }
  />
);

const RULES = ["Real names only.", "At least two verified adults in every group.", "No one-to-one chats.", "No phone numbers. Ever."];

export const SafetyRulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Split
      flip
      kicker="Safe by design"
      title="Rules every group keeps."
      body=""
      punch={{ at: 130, hold: 50 }}
      phone={
        <PunchIn at={130} hold={50} zoom={1.8} x={0.4} y={0.3}>
          <IPhone src="app/d1-group-info-tall.jpg" height={820} sourcePt={1500} />
        </PunchIn>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
        {RULES.map((l, i) => (
          <div key={l} style={{ overflow: "hidden" }}>
            <div style={{ fontFamily: roboto, fontWeight: 500, fontSize: 42, color: C.ink, translate: `0px ${kf(frame, [30 + i * 12, 62 + i * 12], [110, 0])}%` }}>{l}</div>
          </div>
        ))}
      </div>
    </Split>
  );
};

const EndBrand: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const icon = kf(frame, [4, 44], [0, 1]);
  return (
    <Page bg={C.white}>
      <Center gap={36}>
        <div style={{ scale: String(0.4 + 0.6 * icon), opacity: icon }}>
          <AppIcon size={200} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: C.ink, translate: `0px ${kf(frame, [24, 58], [110, 0])}%` }}>Destiny One</div>
        </div>
        {children}
      </Center>
    </Page>
  );
};

export const ComingSoonEnd: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <EndBrand>
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            fontFamily: dosis,
            fontWeight: 700,
            fontSize: 72,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.accent,
            translate: `0px ${kf(frame, [40, 66], [110, 0])}%`,
          }}
        >
          Coming in 2027
        </div>
      </div>
    </EndBrand>
  );
};

export const DownloadEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const p = kf(frame, [60, 96], [0, 1]);
  return (
    <EndBrand>
      <Body delay={44} size={50} color={C.ink}>
        Download today.
      </Body>
      {/* Apple's official badge, unmodified (App Store marketing guidelines). */}
      <Img src={staticFile("brand/app-store-badge.svg")} style={{ height: 110, width: 110 * (119.66407 / 40), marginTop: 10, opacity: p, translate: `0px ${(1 - p) * 40}px` }} />
    </EndBrand>
  );
};

export const FinalLogo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Center gap={30}>
        <div style={{ opacity: kf(frame, [2, 28], [0, 1]) }}>
          <Logo width={640} />
        </div>
        <div style={{ fontFamily: dosis, fontWeight: 600, fontSize: 32, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", opacity: kf(frame, [20, 44], [0, 1]) }}>
          Transforming lives through faith, hope and love for Jesus Christ
        </div>
      </Center>
    </Page>
  );
};
