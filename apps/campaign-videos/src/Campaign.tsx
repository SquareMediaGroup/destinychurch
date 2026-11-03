import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C } from "./theme";
import {
  HeroScene,
  IntroScene,
  LittleThingSlide,
  LittleThingsTitle,
  MinistriesScene,
  MobileScene,
  OneMoreThingScene,
  OpenScene,
  SearchScene,
  SermonsScene,
  VisitScene,
  WebsiteEndScene,
  WhatsOnScene,
} from "./scenes/website";
import { AiScene, AppIntroScene, AppearanceScene, ChatsScene, ComingSoonEnd, ConversationScene, DownloadEnd, EventsScene, FinalLogo, SafetyScene } from "./scenes/app";

export type CampaignProps = {
  readonly ending: "coming-2027" | "download-today";
};

const X = 12; // crossfade length in frames

/**
 * Website first: hero, then the main features, then the little things,
 * then a full "this is the end" logo. Then "one more thing" and Destiny One,
 * with one of two endings.
 */
export const Campaign: React.FC<CampaignProps> = ({ ending }) => {
  const { fps } = useVideoConfig();
  const t = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: X })} />;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Welcome home" durationInFrames={4 * fps}>
          <OpenScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="New website" durationInFrames={4 * fps}>
          <IntroScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Hero" durationInFrames={5 * fps}>
          <HeroScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Smart Search" durationInFrames={7.5 * fps}>
          <SearchScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Sermons" durationInFrames={6 * fps}>
          <SermonsScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="What's On" durationInFrames={5.5 * fps}>
          <WhatsOnScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Plan your visit" durationInFrames={5 * fps}>
          <VisitScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Ministries" durationInFrames={5.5 * fps}>
          <MinistriesScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Little things title" durationInFrames={2.2 * fps}>
          <LittleThingsTitle />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Accessibility" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={0} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Back of the seat" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={1} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Song requests" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={2} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Talent show" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={3} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Help centre" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={4} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Training" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={5} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Governance" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={6} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Links" durationInFrames={2.4 * fps}>
          <LittleThingSlide index={7} />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Every screen" durationInFrames={5.5 * fps}>
          <MobileScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Website end" durationInFrames={4.5 * fps}>
          <WebsiteEndScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Pause" durationInFrames={0.6 * fps}>
          <AbsoluteFill style={{ background: "#000" }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="One more thing" durationInFrames={3.4 * fps}>
          <OneMoreThingScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Destiny One" durationInFrames={5 * fps}>
          <AppIntroScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Chats" durationInFrames={5.5 * fps}>
          <ChatsScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Conversation" durationInFrames={6 * fps}>
          <ConversationScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="DestinyAI" durationInFrames={5.5 * fps}>
          <AiScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Events" durationInFrames={4.5 * fps}>
          <EventsScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Appearance" durationInFrames={5 * fps}>
          <AppearanceScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Safety" durationInFrames={5.5 * fps}>
          <SafetyScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name={ending === "coming-2027" ? "Coming in 2027" : "Download today"} durationInFrames={5.5 * fps}>
          {ending === "coming-2027" ? <ComingSoonEnd /> : <DownloadEnd />}
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Destiny Church" durationInFrames={3 * fps}>
          <FinalLogo />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/** Sum of the scene lengths minus the 18 crossfades. Keep in sync with the timeline above. */
export const CAMPAIGN_FRAMES = 3486;
