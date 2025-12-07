export type Sermon = {
  id: string;
  title: string;
  date: string;
  speaker?: string;
  youtubeVideoId?: string;
  youtubePubDate?: string;
  podcastGuid?: string;
  podcastPubDate?: string;
  podcastAudioUrl?: string;
  videoUrl?: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  summary?: string;
  transcript?: string;
  tags?: string[];
};

export type ContinueWatchingEntry = {
  sermonId: string;
  lastPosition: number;
  lastUpdated: number;
  durationSeconds?: number;
};
