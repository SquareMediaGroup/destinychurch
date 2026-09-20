import { getPodcastShow } from "@/lib/podcast";
import {
  getUploadedVideos,
  getFullSermonArchive,
  getSpeakerOverrides,
  type SpeakerOverrideRow,
} from "@/lib/speakerOverrides.server";
import { getPlaylistSnippet, getPlaylistVideoIds } from "@/lib/youtube";
import { getSermonSeriesRows } from "@/lib/sermonSeries.server";
import { PageHeader, Badge, cardClass } from "@/components/admin/AdminUI";
import SermonsAdminClient from "./SermonsAdminClient";
import SpeakerReviewPanel from "@/components/admin/SpeakerReviewPanel";
import SpeakerEditor from "@/components/admin/SpeakerEditor";
import SeriesManager, { type SeriesManagerRow } from "@/components/admin/SeriesManager";

export const dynamic = "force-dynamic";

export default async function SermonsAdminPage() {
  const [show, archive, fullArchive, seriesRows] = await Promise.all([
    getPodcastShow().catch(() => null),
    // One page is plenty to resolve a pairing hint against recently-published
    // videos — the admin only needs this for episodes uploaded in the last
    // few weeks, not the whole channel history.
    getUploadedVideos().catch(() => ({ videos: [], nextPageToken: null })),
    // The manual speaker editor searches the whole archive, same scope as the
    // AI review job below.
    getFullSermonArchive().catch(() => []),
    getSermonSeriesRows().catch(() => []),
  ]);

  const recentEpisodes = (show?.episodes ?? []).slice(0, 10);
  const videosById = new Map(archive.videos.map((v) => [v.id, v]));

  const overridesMap = await getSpeakerOverrides(fullArchive.map((v) => v.id)).catch(
    () => new Map<string, SpeakerOverrideRow>()
  );
  const overrides = Object.fromEntries(overridesMap);

  const seriesManagerRows: SeriesManagerRow[] = await Promise.all(
    seriesRows.map(async (row): Promise<SeriesManagerRow> => {
      const [snippet, videoIds] = await Promise.all([
        getPlaylistSnippet(row.playlistId).catch(() => null),
        getPlaylistVideoIds(row.playlistId).catch(() => new Set<string>()),
      ]);
      if (!snippet) {
        return { playlistId: row.playlistId, title: null, videoCount: null, unresolved: true };
      }
      return {
        playlistId: row.playlistId,
        title: snippet.title,
        videoCount: videoIds.size,
        unresolved: false,
      };
    })
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Sermons"
        subtitle="Publish sermon audio to the podcast feed. Video keeps going to YouTube as normal."
      />

      <div className={`${cardClass} p-6`}>
        <SermonsAdminClient />
      </div>

      <div className="mt-8">
        <SeriesManager rows={seriesManagerRows} />
      </div>

      <div className="mt-8">
        <SpeakerReviewPanel />
      </div>

      <div className="mt-8">
        <SpeakerEditor videos={fullArchive} overrides={overrides} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-destiny-grey/70 dark:text-white/70">
          Recently published episodes
        </h2>
        <div className={`${cardClass} divide-y divide-black/5 dark:divide-white/8`}>
          {recentEpisodes.length === 0 && (
            <p className="p-5 text-sm text-destiny-grey/50 dark:text-white/50">
              No episodes yet.
            </p>
          )}
          {recentEpisodes.map((ep) => {
            const matchedVideo = ep.youtubeIdHint ? videosById.get(ep.youtubeIdHint) : undefined;
            return (
              <div key={ep.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-destiny-grey dark:text-white">
                    {ep.title}
                  </p>
                  <p className="mt-0.5 text-xs text-destiny-grey/50 dark:text-white/50">
                    {ep.speaker ?? "No speaker set"}
                  </p>
                </div>
                {ep.youtubeIdHint ? (
                  <Badge tone="green">
                    {matchedVideo ? `Matched · ${matchedVideo.title}` : "Matched"}
                  </Badge>
                ) : (
                  <Badge tone="grey">No video ID yet</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
