import { Sermon } from "./types";

export const getViewId = (sermon: Sermon): string => {
  if (sermon.youtubeVideoId) return sermon.youtubeVideoId;
  if (sermon.podcastGuid) return sermon.podcastGuid;
  return sermon.id;
};
