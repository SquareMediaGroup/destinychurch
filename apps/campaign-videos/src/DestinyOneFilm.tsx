import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Html5Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { C } from "./theme";
import { Center, Headline, IPhone, Page, PunchIn, useExit } from "./ui";
import { AiScene, AppIntroScene, AppearanceScene, ChatsScene, ComingSoonEnd, ConversationScene, SafetyRulesScene, SafetyScene, Split } from "./scenes/app";

/**
 * The one-minute Destiny One film for destinytees.uk/app: the app on its own, in more depth than the
 * end of the campaign film. It reuses the campaign's app scenes and adds announcements and events.
 *
 * Music: "Inspired" by Kevin MacLeod (incompetech.com), licensed under Creative Commons:
 * By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). The credit is on /app and in the README.
 */

const X = 8;

const HookScene: React.FC = () => {
  const e = useExit(18);
  return (
    <Page bg={C.white}>
      <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -90}px` }}>
        <Center>
          <Headline text="Church doesn't stop on Sunday." size={104} align="center" accent={["Sunday"]} />
        </Center>
      </AbsoluteFill>
    </Page>
  );
};

const AnnouncementsScene: React.FC = () => (
  <Split
    kicker="Announcements"
    title="Church news, in one place."
    body="Notices from the church office land in Announcements, where only admins can post, so nothing gets lost in a busy chat."
    accent={["one"]}
    punch={{ at: 80, hold: 50 }}
    phone={
      <PunchIn at={80} hold={50} zoom={1.6} x={0.5} y={0.5}>
        <IPhone src="app/d1-group_g_announce.jpg" height={820} />
      </PunchIn>
    }
  />
);

const EventsScene: React.FC = () => (
  <Split
    flip
    kicker="What's on"
    title="Every event, a tap away."
    body="See what's coming up, then send it straight to your group."
    accent={["tap"]}
    phone={<IPhone src="app/d1-events.jpg" height={820} />}
  />
);

const SCENES: { name: string; seconds: number; el: React.ReactNode }[] = [
  { name: "Hook", seconds: 3, el: <HookScene /> },
  { name: "Destiny One", seconds: 4.5, el: <AppIntroScene /> },
  { name: "Chats", seconds: 5.5, el: <ChatsScene /> },
  { name: "Announcements", seconds: 7, el: <AnnouncementsScene /> },
  { name: "Conversation", seconds: 6.5, el: <ConversationScene /> },
  { name: "Events", seconds: 4.5, el: <EventsScene /> },
  { name: "DestinyAI", seconds: 9, el: <AiScene /> },
  { name: "Appearance", seconds: 5, el: <AppearanceScene /> },
  { name: "Safety", seconds: 7, el: <SafetyScene /> },
  { name: "Safety rules", seconds: 7.5, el: <SafetyRulesScene /> },
  { name: "Coming in 2027", seconds: 6, el: <ComingSoonEnd /> },
];

const FPS = 30;
export const DESTINY_ONE_FILM_FRAMES = SCENES.reduce((n, s) => n + Math.round(s.seconds * FPS), 0) - (SCENES.length - 1) * X;

const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Html5Audio
      src={staticFile("audio/inspired.mp3")}
      volume={(f) => interpolate(f, [0, 12, durationInFrames - 90, durationInFrames - 2], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

export const DestinyOneFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <Music />
      <TransitionSeries>
        {SCENES.flatMap((s, i) => [
          ...(i ? [<TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: X })} />] : []),
          <TransitionSeries.Sequence key={s.name} name={s.name} durationInFrames={Math.round(s.seconds * FPS)}>
            {s.el}
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
