import type { Metadata } from "next";
import SermonCard from "@/components/SermonCard";
import Section from "@/components/Section";
import { listGuestSermons } from "@/lib/db";

export const revalidate = 300;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Guest Speakers",
  description: "Messages from visiting voices and friends of Destiny Church.",
};

export default async function GuestSermonsPage() {
  const sermons = await listGuestSermons(100);

  return (
    <Section
      kicker="Guest speakers"
      title="Friends of Destiny"
      description="Catch every message shared by guest speakers. Fresh perspectives, same Gospel."
      spacing="loose"
    >
      {sermons.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sermons.map((sermon) => (
            <SermonCard key={sermon.id} sermon={sermon} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-black/5 bg-white px-4 py-6 text-sm text-destiny-grey shadow-sm">
          No guest sermons yet. Check back soon.
        </div>
      )}
    </Section>
  );
}
