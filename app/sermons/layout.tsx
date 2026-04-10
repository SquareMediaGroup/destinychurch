import SermonsHeader from "@/components/sermons/SermonsHeader";
import SermonsDrawer from "@/components/sermons/SermonsDrawer";
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
        <SermonsDrawer />
        <div className="ml-14 min-h-screen bg-[#0f0f0f]">{children}</div>
      </SermonSearchProvider>
    </SermonPlayerProvider>
  );
}
