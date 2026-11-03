import { Composition, Folder } from "remotion";
import { Campaign, CAMPAIGN_FRAMES } from "./Campaign";

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
