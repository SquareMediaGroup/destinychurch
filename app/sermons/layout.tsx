import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";
import { SermonSearchProvider } from "@/lib/sermonSearchContext";

export const revalidate = 3600;

export default async function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SermonPlayerProvider>
      <SermonSearchProvider initialSuggestions={[]}>
        <div className="min-h-screen bg-[#0f0f0f]">{children}</div>
      </SermonSearchProvider>
    </SermonPlayerProvider>
  );
}
