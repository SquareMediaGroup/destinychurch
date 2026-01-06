import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import SermonCard from "@/components/SermonCard";
import { listSermonsLite } from "@/lib/db";
import { getViewId } from "@/lib/viewIds";

export default async function WatchHome() {
  const sermons = await listSermonsLite(12);
  const latestSermon = sermons[0];
  const latestHref = latestSermon
    ? `/sermons/view?viewId=${encodeURIComponent(getViewId(latestSermon))}`
    : "/sermons";
  const guestSermons = sermons.filter((sermon) => sermon.guestSpeaker).slice(0, 3);
  const latestMessages = sermons.slice(0, 6);

  return (
    <div className="space-y-12">
      <Hero
        kicker="NEW - AI Sermon Summaries"
        title="Watch live & on demand"
        subtitle="Join us online every Sunday or catch up midweek with video, podcast, and transcripts."
        backgroundImage="/Images/Bible Image Destiny Church.jpg"
        primaryAction={{ label: "Watch latest sermon", href: latestHref }}
        secondaryAction={{ label: "Plan an in-person visit", href: "https://destinytees.uk/visit" }}
      />

      <Section
        kicker="Latest message"
        title="Catch up from Sunday"
        description="Watch the latest upload with summary, transcript, and continue watching."
      >
        {sermons.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-destiny-grey">
            No sermons yet. Run the sync to pull the latest 25.
          </div>
        ) : (
          <CardGrid>
            {latestMessages.map((sermon, index) => (
              <SermonCard
                key={sermon.id}
                sermon={sermon}
                priority={index === 0}
              />
            ))}
          </CardGrid>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <CTAButton href="/sermons" variant="ghost">
            Browse all sermons
          </CTAButton>
          <CTAButton href="https://youtube.com" variant="ghost">
            Watch on YouTube
          </CTAButton>
        </div>
      </Section>

      <Section
        kicker="Guest sermons"
        title="Latest guest speakers"
        description="Catch recent guest messages from Destiny Church."
      >
        {guestSermons.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-destiny-grey">
            No guest sermons yet. Check back after the next guest speaker.
          </div>
        ) : (
          <CardGrid columns={3}>
            {guestSermons.map((sermon, index) => (
              <SermonCard key={sermon.id} sermon={sermon} priority={index === 0} />
            ))}
          </CardGrid>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <CTAButton href="/sermons/guests" variant="ghost">
            Browse all Guest Sermons
          </CTAButton>
        </div>
      </Section>
    </div>
  );
}
