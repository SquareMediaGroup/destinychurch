import SermonsHeader from "@/components/sermons/SermonsHeader";
import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";
import { SermonSearchProvider } from "@/lib/sermonSearchContext";

export default function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SermonPlayerProvider>
      <SermonSearchProvider>
        <SermonsHeader />
        <div className="min-h-screen bg-[#0f0f0f]">{children}</div>
      </SermonSearchProvider>
    </SermonPlayerProvider>
  );
}
