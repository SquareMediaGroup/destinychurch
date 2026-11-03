import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, dosis, roboto } from "../theme";
import { AppIcon, Body, Center, Headline, IPhone, Kicker, Logo, Page, kf, useExit } from "../ui";

const Exit: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 16 }) => {
  const e = useExit(frames);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -80}px` }}>{children}</AbsoluteFill>;
};

/** Text on one side; the phone rises in on the other. */
const Split: React.FC<{ kicker: string; title: string; body: string; phone: React.ReactNode; flip?: boolean; accent?: string[] }> = ({ kicker, title, body, phone, flip, accent }) => {
  const frame = useCurrentFrame();
  const rise = kf(frame, [0, 34], [900, 0]);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 150 }}>
          <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 24 }}>
            <Kicker>{kicker}</Kicker>
            <Headline text={title} size={88} align="left" accent={accent} />
            <Body delay={22} align="left" size={40}>
              {body}
            </Body>
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
  const icon = kf(frame, [4, 34], [0, 1]);
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={44}>
          <div style={{ scale: String(0.4 + 0.6 * icon), opacity: icon }}>
            <AppIcon size={260} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 150, letterSpacing: "-0.04em", color: C.ink, translate: `0px ${kf(frame, [24, 50], [110, 0])}%` }}>Destiny One</div>
          </div>
          <Body delay={44} size={50}>
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
    phone={<IPhone src="app/d1-chats.jpg" height={900} tabs />}
  />
);

/** The worship team chat, scrolled up through a poll, a sermon and replies in two eased moves. */
const ConversationPhone: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = Math.round(durationInFrames * 0.55);
  return <IPhone src="app/d1-group_g_worship-dark-tall.jpg" height={900} color="black" dark sourcePt={1500} scroll={kf(frame, [34, 64, mid, mid + 30], [0.35, 0.62, 0.62, 1])} />;
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

export const AiScene: React.FC = () => (
  <Split
    kicker="DestinyAI · Beta"
    title="Ask DestinyAI anything about Destiny."
    body="What's on this week, service times, or last Sunday's sermon. Just ask."
    accent={["DestinyAI"]}
    phone={<IPhone src="app/d1-group_g_ai.jpg" height={900} />}
  />
);

export const EventsScene: React.FC = () => (
  <Split
    flip
    kicker="What's On"
    title="See what's coming up."
    body="Upcoming church events in the app. Share one to a chat in two taps."
    phone={<IPhone src="app/d1-find.jpg" height={900} tabs />}
  />
);

// Make it yours: three phones, light and dark.
export const AppearanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const phones: { src: string; x: number; delay: number; dark: boolean; tabs: boolean; color: "silver" | "black" }[] = [
    { src: "app/d1-chats.jpg", x: -500, delay: 8, dark: false, tabs: true, color: "silver" },
    { src: "app/d1-appearance-dark.jpg", x: 0, delay: 0, dark: true, tabs: false, color: "black" },
    { src: "app/d1-chats-dark.jpg", x: 500, delay: 14, dark: true, tabs: true, color: "black" },
  ];
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 80 }}>
          <Headline text="Light, dark or true dark. Make it yours." size={80} accent={["yours"]} />
        </AbsoluteFill>
        {phones.map((p) => (
          <div key={p.src} style={{ position: "absolute", left: 960 + p.x - 205, top: 250, translate: `0px ${kf(frame, [p.delay, p.delay + 34], [800, 0])}px` }}>
            <IPhone src={p.src} height={840} dark={p.dark} tabs={p.tabs} color={p.color} />
          </div>
        ))}
      </Exit>
    </Page>
  );
};

// Safe by design (copy matches the rules the server enforces)
export const SafetyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = ["Real names only.", "At least two verified adults in every group.", "No one-to-one chats.", "No phone numbers. Ever."];
  return (
    <Page bg={C.white}>
      <Exit>
        <Center gap={30}>
          <Kicker>Safe by design</Kicker>
          <Headline text="Built for church, with safeguarding at its heart." size={84} accent={["safeguarding"]} />
          <div style={{ height: 24 }} />
          {lines.map((l, i) => (
            <div key={l} style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: roboto, fontWeight: 500, fontSize: 46, color: C.ink, translate: `0px ${kf(frame, [34 + i * 10, 58 + i * 10], [110, 0])}%` }}>{l}</div>
            </div>
          ))}
        </Center>
      </Exit>
    </Page>
  );
};

const EndBrand: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const icon = kf(frame, [2, 30], [0, 1]);
  return (
    <Page bg={C.white}>
      <Center gap={36}>
        <div style={{ scale: String(0.4 + 0.6 * icon), opacity: icon }}>
          <AppIcon size={200} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: C.ink, translate: `0px ${kf(frame, [16, 42], [110, 0])}%` }}>Destiny One</div>
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
  const p = kf(frame, [44, 70], [0, 1]);
  return (
    <EndBrand>
      <Body delay={32} size={50} color={C.ink}>
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
