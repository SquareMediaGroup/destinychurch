import AnnouncementBanner from "@/components/AnnouncementBanner";
import WatchHome from "@/components/WatchHome";
import { getActiveAnnouncement } from "@/lib/announcements";

export const revalidate = 300;
export const runtime = "nodejs";

export default async function Home() {
  const announcement = await getActiveAnnouncement();

  return (
    <div className="space-y-6">
      {announcement ? (
        <AnnouncementBanner message={announcement.message} />
      ) : null}
      <WatchHome />
    </div>
  );
}
