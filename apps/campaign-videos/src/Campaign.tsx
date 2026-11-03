import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C } from "./theme";
import {
  BeforeAfter,
  BeforeAfterPhones,
  DevicesScene,
  HomeScroll,
  IntroScene,
  LittleThingSlide,
  LittleThingsTitle,
  MinistriesScene,
  OneMoreThingScene,
  PerformanceScene,
  SearchPhoneScene,
  SearchScene,
  SermonsScene,
  ShopBeforeAfter,
  ShopCheckoutScene,
  ShopMoveScene,
  VisitScene,
  WebsiteEndScene,
  WhatsOnScene,
  WhyScene,
} from "./scenes/website";
import { AiScene, AppIntroScene, AppearanceScene, ChatsScene, ComingSoonEnd, ConversationScene, DownloadEnd, FinalLogo, SafetyRulesScene, SafetyScene } from "./scenes/app";

export type CampaignProps = {
  readonly ending: "coming-2027" | "download-today";
};

// Scenes leave with their own eased move, so the crossfade between them is short.
const X = 8;

/**
 * The website first: why it changed, before and after, how much faster it is, then its features,
 * the shop, and the little things. It ends on the logo, then "one more thing" introduces Destiny One.
 */
export const Campaign: React.FC<CampaignProps> = ({ ending }) => {
  const { fps } = useVideoConfig();
  const t = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: X })} />;
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="New website" durationInFrames={5 * fps}>
          <IntroScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Why" durationInFrames={6.5 * fps}>
          <WhyScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: home" durationInFrames={6.5 * fps}>
          <BeforeAfter name="home" title="A fresh new look." first />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: visit" durationInFrames={3.5 * fps}>
          <BeforeAfter name="visit" title="Plan your visit" />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: what's on" durationInFrames={3.5 * fps}>
          <BeforeAfter name="whatson" title="What's On" />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: give" durationInFrames={3.5 * fps}>
          <BeforeAfter name="give" title="Give" />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: alpha" durationInFrames={3.5 * fps}>
          <BeforeAfter name="alpha" title="Alpha" />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Before and after: phone" durationInFrames={5 * fps}>
          <BeforeAfterPhones />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Performance" durationInFrames={8 * fps}>
          <PerformanceScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Home" durationInFrames={8 * fps}>
          <HomeScroll />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Smart Search" durationInFrames={9 * fps}>
          <SearchScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Smart Search on a phone" durationInFrames={7 * fps}>
          <SearchPhoneScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Sermons" durationInFrames={8 * fps}>
          <SermonsScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="What's On" durationInFrames={8 * fps}>
          <WhatsOnScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Plan your visit" durationInFrames={8 * fps}>
          <VisitScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Shop has moved" durationInFrames={5 * fps}>
          <ShopMoveScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Shop before and after" durationInFrames={6.5 * fps}>
          <ShopBeforeAfter />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Shop checkout" durationInFrames={8 * fps}>
          <ShopCheckoutScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Ministries" durationInFrames={5.5 * fps}>
          <MinistriesScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Little things title" durationInFrames={2.5 * fps}>
          <LittleThingsTitle />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Accessibility" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={0} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Back of the seat" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={1} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Help centre" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={2} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Training" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={3} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Governance" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={4} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Links" durationInFrames={2.8 * fps}>
          <LittleThingSlide index={5} />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Every screen" durationInFrames={6 * fps}>
          <DevicesScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Website end" durationInFrames={5 * fps}>
          <WebsiteEndScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Pause" durationInFrames={0.6 * fps}>
          <AbsoluteFill style={{ background: C.white }} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="One more thing" durationInFrames={4 * fps}>
          <OneMoreThingScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Destiny One" durationInFrames={6 * fps}>
          <AppIntroScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Chats" durationInFrames={6 * fps}>
          <ChatsScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Conversation" durationInFrames={7 * fps}>
          <ConversationScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="DestinyAI" durationInFrames={9.5 * fps}>
          <AiScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Appearance" durationInFrames={6 * fps}>
          <AppearanceScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Safety" durationInFrames={7 * fps}>
          <SafetyScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Safety rules" durationInFrames={7.5 * fps}>
          <SafetyRulesScene />
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name={ending === "coming-2027" ? "Coming in 2027" : "Download today"} durationInFrames={7 * fps}>
          {ending === "coming-2027" ? <ComingSoonEnd /> : <DownloadEnd />}
        </TransitionSeries.Sequence>
        {t}
        <TransitionSeries.Sequence name="Destiny Church" durationInFrames={4.5 * fps}>
          <FinalLogo />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/** Sum of the scene lengths minus the 29 crossfades of 8 frames. Keep in sync with the timeline above. */
export const CAMPAIGN_FRAMES = 6170;
