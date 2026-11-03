import { Composition, Folder } from "remotion";
import { Campaign, CAMPAIGN_FRAMES } from "./Campaign";
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
