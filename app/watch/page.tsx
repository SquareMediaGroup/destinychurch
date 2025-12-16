import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import SermonCard from "@/components/SermonCard";
import { listSermons } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WatchPage() {
  const sermons = await listSermons(4);

  return (
    <div className="space-y-12">
      <Hero
        kicker="Watch"
        title="Watch live & on demand"
        subtitle="Join us online every Sunday or catch up midweek with video, podcast, and transcripts."
        backgroundImage="https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1900&q=80"
        primaryAction={{ label: "Watch latest sermon", href: "/sermons" }}
        secondaryAction={{ label: "Plan an in-person visit", href: "/new-here" }}
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
            {sermons.map((sermon, index) => (
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
          <CTAButton
            href="https://youtube.com"
            variant="ghost"
          >
            Watch on YouTube
          </CTAButton>
        </div>
      </Section>

      <Section
        kicker="Ways to watch"
        title="Pick the best fit for you"
        description="Stream live, catch up later, or listen on the go."
      >
        <CardGrid columns={3}>
          <Card
            title="Live every Sunday"
            description="Join the livestream from anywhere. Starts 11:00am with worship and message."
            href="/sermons"
            cta="Watch live"
            eyebrow="Livestream"
          />
          <Card
            title="Podcast replay"
            description="Listen on the school run or commute. Available wherever you get podcasts."
            href="/sermons"
            cta="Open podcast"
            eyebrow="Audio"
          />
          <Card
            title="Continue watching"
            description="Pause on one device, pick up on another. Your progress is saved locally."
            href="/sermons"
            cta="Resume"
            eyebrow="Progress"
          />
        </CardGrid>
      </Section>
    </div>
  );
}
