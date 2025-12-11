export type SummaryPoint = {
  id: string;
  order_index: number;
  title: string;
  description: string;
  start_seconds: number;
};

export type SummaryPointsPayload = {
  points: SummaryPoint[];
};

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
  summaryPoints?: SummaryPointsPayload;
  transcript?: string;
  tags?: string[];
};

export type ContinueWatchingEntry = {
  sermonId: string;
  lastPosition: number;
  lastUpdated: number;
  durationSeconds?: number;
};

export type AiReport = {
  id: string;
  sermonId: string | null;
  issueType: string;
  name: string;
  email: string;
  description: string;
  createdAt?: string;
};

export type PlaylistItem = {
  id: string;
  position: number;
  sermon: Sermon;
};

export type Playlist = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  items: PlaylistItem[];
  createdAt?: string;
  updatedAt?: string;
};
