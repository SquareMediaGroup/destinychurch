import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import SermonSearch from "@/components/SermonSearch";
import { listSermonsLite } from "@/lib/db";

export const revalidate = 300;
export const runtime = "nodejs";

export default async function SermonsPage() {
  const sermons = await listSermonsLite(25);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Weekly sermons</p>
        <h1 className="text-3xl font-bold text-destiny-black">Watch & grow</h1>
        <p className="max-w-2xl text-destiny-grey">
          Recent messages, smart summaries, full transcripts.
          Pick up where you left off or explore new series and topics.
        </p>
      </header>

      <ContinueWatchingRow sermons={sermons} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-destiny-black">
            Latest uploads
          </h2>
        </div>
        <SermonSearch sermons={sermons} />
      </section>
    </div>
  );
}
