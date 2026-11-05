import { Composition, Folder } from "remotion";
import { Campaign, CAMPAIGN_FRAMES } from "./Campaign";
import { AdminWelcome, ADMIN_WELCOME_FRAMES } from "./AdminWelcome";
import { DestinyOneFilm, DESTINY_ONE_FILM_FRAMES } from "./DestinyOneFilm";
import { EventsTutorial, EVENTS_TUTORIAL_FRAMES } from "./EventsTutorial";
import { ShopTutorial, SHOP_TUTORIAL_FRAMES } from "./ShopTutorial";
import { SiteTutorial, SITE_TUTORIAL_FRAMES } from "./SiteTutorial";
import { BeforeAfter, ShopBeforeAfter } from "./scenes/website";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Campaign">
        <Composition
          id="ComingIn2027"
          component={Campaign}
          durationInFrames={CAMPAIGN_FRAMES}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ ending: "coming-2027" as const }}
        />
        <Composition
          id="DownloadToday"
          component={Campaign}
          durationInFrames={CAMPAIGN_FRAMES}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ ending: "download-today" as const }}
        />
      </Folder>
      {/* One minute on Destiny One alone, with music, for destinytees.uk/app. */}
      <Composition id="DestinyOneFilm" component={DestinyOneFilm} durationInFrames={DESTINY_ONE_FILM_FRAMES} fps={30} width={1920} height={1080} />
      {/* Admin help series, video 1, for /admin/help and YouTube. */}
      <Composition id="AdminWelcome" component={AdminWelcome} durationInFrames={ADMIN_WELCOME_FRAMES} fps={30} width={1920} height={1080} />
      {/* Admin help series, video 2: everything a Store Admin can do. Frames from capture/shop-tutorial.cjs. */}
      <Composition id="EventsTutorial" component={EventsTutorial} durationInFrames={EVENTS_TUTORIAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="SiteTutorial" component={SiteTutorial} durationInFrames={SITE_TUTORIAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="ShopTutorial" component={ShopTutorial} durationInFrames={SHOP_TUTORIAL_FRAMES} fps={30} width={1920} height={1080} />
      {/* Before/after scenes pinned fully before or after, for matching slider images (scripts/export-stills.mjs). */}
      <Folder name="Stills">
        <Composition
          id="BeforeAfterStill"
          component={BeforeAfter}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ name: "home", title: "A fresh new look.", first: true, freeze: "after" as const }}
        />
        <Composition
          id="ShopBeforeAfterStill"
          component={ShopBeforeAfter}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ freeze: "after" as const }}
        />
      </Folder>
    </>
  );
};
