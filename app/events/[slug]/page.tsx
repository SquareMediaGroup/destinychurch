import CTAButton from "@/components/CTAButton";
import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { events, formatEventDate, getEventBySlug } from "@/content/events";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type EventPageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = params;
  const event = getEventBySlug(slug);

  if (!event) {
    return {
      title: "Event not found",
    };
  }

  return {
    title: `${event.title} | Destiny Church`,
    description: event.excerpt,
    openGraph: {
      title: event.title,
      description: event.excerpt,
      images: [
        {
          url: event.image,
          width: 1600,
          height: 900,
          alt: event.title,
        },
      ],
    },
  };
}

export default function EventDetailPage({ params }: EventPageProps) {
  const { slug } = params;
  const event = getEventBySlug(slug);

  if (!event) return notFound();

  const moreEvents = events.filter((item) => item.slug !== slug).slice(0, 3);
  const dateLabel = `${formatEventDate(event.date)} · ${event.time}`;

  return (
    <div className="space-y-12">
      <Hero
        kicker={event.category}
        title={event.title}
        subtitle={event.excerpt}
        backgroundImage={event.image}
        primaryAction={{
          label: event.ctaLabel ?? "I’m coming",
          href: event.ctaHref ?? "/contact",
        }}
        secondaryAction={{
          label: "View all events",
          href: "/whats-on",
          variant: "secondary",
        }}
      >
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/80">
          <span className="rounded-full border border-white/20 px-3 py-1">
            {dateLabel}
          </span>
          <span className="rounded-full border border-white/20 px-3 py-1">
            {event.location}
          </span>
        </div>
      </Hero>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="When" value={dateLabel} />
              <InfoTile label="Where" value={event.location} />
            </div>
            <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
              <p className="text-sm font-semibold text-destiny-black">
                What to expect
              </p>
              <p className="text-sm text-destiny-grey leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-sm font-semibold text-destiny-black">
              Come along
            </p>
            <p className="text-sm text-destiny-grey">
              Let us know you’re coming and we’ll connect you with the right
              people on the day.
            </p>
            <div className="grid gap-2">
              <CTAButton
                href={event.ctaHref ?? "/contact"}
                className="w-full text-center"
              >
                {event.ctaLabel ?? "I’m coming"}
              </CTAButton>
              <CTAButton
                href="/new-here"
                variant="ghost"
                className="w-full text-center"
              >
                Plan your visit
              </CTAButton>
            </div>
          </div>
        </div>
      </Section>

      {moreEvents.length > 0 && (
        <Section
          kicker="More to explore"
          title="You might also like"
          description="Catch up on other upcoming gatherings and courses."
        >
          <CardGrid>
            {moreEvents.map((item) => (
              <Card
                key={item.slug}
                title={item.title}
                description={item.excerpt}
                href={`/events/${item.slug}`}
                eyebrow={`${formatEventDate(item.date)} · ${item.time}`}
                meta={item.category}
              >
                <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-destiny-grey">
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                    {item.location}
                  </span>
                </div>
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destiny-grey/80">
        {label}
      </p>
      <p className="text-sm font-semibold text-destiny-black">{value}</p>
    </div>
  );
}
