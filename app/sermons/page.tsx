import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import SermonCard from "@/components/SermonCard";
import SermonSearch from "@/components/SermonSearch";
import { listSermons } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SermonsPage() {
  const sermons = await listSermons(25);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Weekly sermons</p>
        <h1 className="text-3xl font-bold text-destiny-black">Watch & grow</h1>
        <p className="max-w-2xl text-destiny-grey">
          A YouTube-inspired grid of recent Destiny Church messages with
          summaries, transcripts, and local continue watching.
        </p>
      </header>

      <ContinueWatchingRow sermons={sermons} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-destiny-black">
            Latest uploads
          </h2>
          <p className="text-sm text-destiny-grey/80">
            Updated automatically from YouTube + podcast
          </p>
        </div>
        <SermonSearch sermons={sermons} />
      </section>
    </div>
  );
}
