import { getCollections, type SermonCollection } from "@/lib/collections";
import { getPlaylistVideos } from "@/lib/youtube";
import CollectionRow from "@/components/sermons/CollectionRow";

interface CollectionSectionProps {
  type: SermonCollection["type"];
}

export default async function CollectionSection({ type }: CollectionSectionProps) {
  const collections = await getCollections(type);
  if (!collections.length) return null;

  const rows = await Promise.all(
    collections.map(async (c) => ({
      ...c,
      videos: await getPlaylistVideos(c.youtube_playlist_id, 15),
    }))
  );

  const isSeries = type === "series";

  return (
    <>
      {rows
        .filter((r) => r.videos.length > 0)
        .map((row) => (
          <CollectionRow
            key={row.id}
            title={row.title}
            description={row.description}
            videos={row.videos}
            showEpisodeNumbers={isSeries}
            seriesPlaylistId={isSeries ? row.youtube_playlist_id : undefined}
          />
        ))}
    </>
  );
}
