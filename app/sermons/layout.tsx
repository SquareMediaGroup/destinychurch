import SermonsSidebar from "@/components/sermons/SermonsSidebar";
import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";

export default function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SermonPlayerProvider>
      <div className="flex min-h-screen bg-[#0f0f0f]">
        <SermonsSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SermonPlayerProvider>
  );
}
