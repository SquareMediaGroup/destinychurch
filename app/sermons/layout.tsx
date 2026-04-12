import SermonsHeader from "@/components/sermons/SermonsHeader";
import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";
import { SermonSearchProvider } from "@/lib/sermonSearchContext";
import { getAllVideos } from "@/lib/youtube";

export const revalidate = 3600;

export default async function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const videos = await getAllVideos(200);
  const initialSuggestions = videos.map((v) => ({ id: v.id, title: v.title }));

  return (
    <SermonPlayerProvider>
      <SermonSearchProvider initialSuggestions={initialSuggestions}>
        <SermonsHeader />
        <div className="min-h-screen bg-[#0f0f0f]">{children}</div>
      </SermonSearchProvider>
    </SermonPlayerProvider>
  );
}
