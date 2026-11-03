import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, dosis, roboto } from "../theme";
import { AppIcon, AppScreen, Body, Center, Glow, Headline, Kicker, Logo, useExit, useProgress } from "../ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const TALL = 1500 / 393;

const Dark: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.ink }) => (
  <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
);

/** Text on one side, the phone on the other. */
const Split: React.FC<{ kicker: string; title: string; body: string; phone: React.ReactNode; flip?: boolean; accent?: string[]; glow?: string[] }> = ({
  kicker,
  title,
  body,
  phone,
  flip,
  accent,
  glow = [C.orange, C.purple],
}) => {
  const enter = useProgress(0, 40);
  const exit = useExit(12);
  return (
    <Dark>
      <Glow colors={glow} intensity={0.32} />
      <AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 140, opacity: exit }}>
        <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 26 }}>
          <Kicker>{kicker}</Kicker>
          <Headline text={title} size={92} align="left" accent={accent} />
          <Body delay={26} align="left" size={42}>
            {body}
          </Body>
        </div>
        <div style={{ opacity: enter, translate: `0px ${(1 - enter) * 220}px` }}>{phone}</div>
      </AbsoluteFill>
    </Dark>
  );
};

// 13. Icon reveal
export const AppIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = interpolate(frame, [6, 46], [0, 1], { ...clamp, easing: ease });
  const exit = useExit(14);
  return (
    <Dark bg="#000">
      <Glow colors={[C.orange]} intensity={interpolate(frame, [10, 60], [0, 0.4], clamp)} drift={0.5} />
      <Center gap={46} style={{ opacity: exit }}>
        <div style={{ opacity: icon, scale: String(0.7 + 0.3 * icon), translate: `0px ${(1 - icon) * 60}px` }}>
          <AppIcon size={260} />
        </div>
        <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 150, letterSpacing: "-0.04em", color: C.white, opacity: useProgress(30, 26) }}>Destiny One</div>
        <Body delay={52} size={50}>
          Our church family, in your pocket.
        </Body>
      </Center>
    </Dark>
  );
};

export const ChatsScene: React.FC = () => (
  <Split
    kicker="Communities"
    title="Every team. Every group. One place."
    body="Announcements, ministries and Connect Groups, together in one tidy list."
    accent={["One"]}
    phone={<AppScreen src="app/d1-chats.jpg" height={880} tabs />}
  />
);

export const ConversationScene: React.FC = () => (
  <Split
    flip
    kicker="Chat"
    title="Polls, sermons and events, right in the chat."
    body="Vote on the setlist, share Sunday's message, and send the next event to the team."
    glow={[C.blue, C.orange]}
    phone={<AppScreen src="app/d1-group_g_worship-tall.jpg" height={880} aspect={TALL} scrollFrom={0.42} scrollTo={0.95} start={30} duration={150} />}
  />
);

export const AiScene: React.FC = () => (
  <Split
    kicker="DestinyAI · Beta"
    title="Ask DestinyAI anything about Destiny."
    body="What's on this week, service times, or last Sunday's sermon. Just ask."
    accent={["DestinyAI"]}
    glow={[C.purple, C.orange]}
    phone={<AppScreen src="app/d1-group_g_ai.jpg" height={880} />}
  />
);

export const EventsScene: React.FC = () => (
  <Split
    flip
    kicker="What's On"
    title="See what's coming up."
    body="Upcoming church events in the app. Share one to a chat in two taps."
    glow={[C.green, C.orange]}
    phone={<AppScreen src="app/d1-find.jpg" height={880} tabs />}
  />
);

// Make it yours
export const AppearanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = useExit(12);
  const phones = [
    { src: "app/d1-chats.jpg", x: -520, delay: 10, dark: false, tabs: true },
    { src: "app/d1-appearance-dark.jpg", x: 0, delay: 0, dark: true, tabs: false },
    { src: "app/d1-group_g_worship-dark.jpg", x: 520, delay: 16, dark: true, tabs: false },
  ];
  return (
    <Dark>
      <Glow intensity={0.3} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 90, opacity: exit }}>
        <Headline text="Light, dark or true dark. Make it yours." size={84} accent={["yours"]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: exit }}>
        {phones.map((p) => {
          const e = interpolate(frame, [p.delay + 10, p.delay + 50], [0, 1], { ...clamp, easing: ease });
          return (
            <div key={p.src} style={{ position: "absolute", left: 960 + p.x - 220, top: 290 + (1 - e) * 520 + (p.x === 0 ? -20 : 40), opacity: e }}>
              <AppScreen src={p.src} height={880} dark={p.dark} tabs={p.tabs} />
            </div>
          );
        })}
      </AbsoluteFill>
    </Dark>
  );
};

// Safe by design (copy matches the rules the server enforces)
export const SafetyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = useExit(12);
  const lines = ["Real names only.", "At least two verified adults in every group.", "No one-to-one chats.", "No phone numbers. Ever."];
  return (
    <Dark>
      <Glow colors={[C.blue, C.green]} intensity={0.22} />
      <Center gap={34} style={{ opacity: exit }}>
        <Kicker>Safe by design</Kicker>
        <Headline text="Built for church, with safeguarding at its heart." size={86} accent={["safeguarding"]} />
        <div style={{ height: 20 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          {lines.map((l, i) => {
            const st = 40 + i * 14;
            const p = interpolate(frame, [st, st + 20], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={l} style={{ fontFamily: roboto, fontWeight: 500, fontSize: 46, color: C.white, opacity: p, translate: `0px ${(1 - p) * 20}px` }}>
                {l}
              </div>
            );
          })}
        </div>
      </Center>
    </Dark>
  );
};

// Endings
export const ComingSoonEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = interpolate(frame, [4, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <Dark bg="#000">
      <Glow colors={[C.orange, C.purple]} intensity={0.3} drift={0.4} />
      <Center gap={40}>
        <div style={{ opacity: icon, scale: String(0.8 + 0.2 * icon) }}>
          <AppIcon size={200} />
        </div>
        <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: C.white, opacity: useProgress(18, 24) }}>Destiny One</div>
        <div
          style={{
            fontFamily: dosis,
            fontWeight: 700,
            fontSize: 72,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.orange,
            opacity: useProgress(44, 26),
            translate: `0px ${(1 - useProgress(44, 26)) * 20}px`,
          }}
        >
          Coming in 2027
        </div>
      </Center>
    </Dark>
  );
};

export const DownloadEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = interpolate(frame, [4, 40], [0, 1], { ...clamp, easing: ease });
  const badges = useProgress(50, 26);
  return (
    <Dark bg="#000">
      <Glow colors={[C.orange, C.purple]} intensity={0.3} drift={0.4} />
      <Center gap={36}>
        <div style={{ opacity: icon, scale: String(0.8 + 0.2 * icon) }}>
          <AppIcon size={200} />
        </div>
        <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: C.white, opacity: useProgress(18, 24) }}>Destiny One</div>
        <Body delay={34} size={50} color={C.white}>
          Download today.
        </Body>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 10, opacity: badges, translate: `0px ${(1 - badges) * 24}px` }}>
          {/* Official badges, unmodified (Apple and Google marketing guidelines). */}
          <Img src={staticFile("brand/app-store-badge.svg")} style={{ height: 104, width: 104 * (119.66407 / 40) }} />
          <Img src={staticFile("brand/google-play-badge.png")} style={{ height: 154, width: 154 * (646 / 250) }} />
        </div>
      </Center>
    </Dark>
  );
};

export const FinalLogo: React.FC = () => {
  const p = useProgress(4, 30);
  return (
    <Dark bg="#000">
      <Center gap={30}>
        <div style={{ opacity: p }}>
          <Logo width={640} />
        </div>
        <div style={{ fontFamily: dosis, fontWeight: 600, fontSize: 32, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", opacity: useProgress(24, 24) }}>
          Transforming lives through faith, hope and love for Jesus Christ
        </div>
      </Center>
    </Dark>
  );
};
