import SermonsHeader from "@/components/sermons/SermonsHeader";
import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";

export default function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SermonPlayerProvider>
      <SermonsHeader />
      <div className="min-h-screen bg-[#0f0f0f]">{children}</div>
    </SermonPlayerProvider>
  );
}
