import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import SermonCard from "@/components/SermonCard";
import { listSermons } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const sermons = await listSermons(3);

  return (
    <div className="space-y-12">
      <Hero
        kicker="Welcome Home"
        title="Make real friends, find real purpose"
        subtitle="Everyone matters, everyone belongs, and everyone has something important to contribute. Join us at Destiny Church Tees Valley."
        primaryAction={{ label: "Plan your visit", href: "/new-here" }}
        secondaryAction={{
          label: "Watch the latest message",
          href: "/watch",
          variant: "secondary",
        }}
        backgroundImage="https://destinytees.uk/wp-content/uploads/2023/11/Welcome-home-scaled.jpg"
      />

      <Section
        kicker="What’s on"
        title="Featured gatherings"
        description="Highlights for the coming weeks. Bring a friend, invite your neighbours, and make yourself at home."
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <iframe
            src="https://destinytees.churchsuite.com/embed/calendar/events?layout=grid&show_search=1&featured=1"
            title="Destiny Church events"
            className="h-[780px] w-full bg-white"
            frameBorder="0"
            scrolling="no"
            style={{ borderWidth: 0 }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--foreground)]/70">
          Looking for more? Visit{" "}
          <a
            href="https://destinytees.churchsuite.com/events"
            className="font-semibold text-destiny-orange underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            the full calendar
          </a>
          .
        </p>
      </Section>

      <Section spacing="tight">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-[#0c1119] via-[#0e1523] to-[#0c1119] text-white">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,128,33,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(12,17,25,0.8),transparent_50%)]" />
          </div>
          <div className="relative grid gap-8 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:py-16">
            <div className="space-y-4">
              <p className="subheading text-sm font-semibold uppercase tracking-[0.16em] text-destiny-orange">
                Our vision
              </p>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                We exist to bring people to Jesus, grow as family, and equip
                every person for their calling in church and in the world.
              </h2>
              <p className="text-base text-white/80">
                Destiny is a vibrant, multi-generational church built on the
                Great Commandment and the Great Commission—loving God, loving
                people, and making disciples.
              </p>
              <div className="flex flex-wrap gap-3">
                <CTAButton href="/about" variant="secondary">
                  Learn about Destiny
                </CTAButton>
                <CTAButton href="/connect" variant="ghost">
                  Find your next step
                </CTAButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <HighlightCard title="Magnify" detail="We love God passionately and live fully devoted to Jesus." />
              <HighlightCard title="Mission" detail="We share the life-transforming message of Jesus across Teesside and beyond." />
              <HighlightCard title="Ministry" detail="Everyone is called to minister and use their God-given S.H.A.P.E." />
              <HighlightCard title="Membership" detail="We belong together—walking side by side helps us do more and endure more." />
              <HighlightCard title="Maturity" detail="We grow to be more like Jesus in character, convictions, and conduct." />
            </div>
          </div>
        </div>
      </Section>

      <Section spacing="tight">
        <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-r from-destiny-orange/15 via-[var(--surface)] to-[var(--surface-muted)] px-6 py-8 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="space-y-1">
            <p className="subheading text-xs font-semibold uppercase tracking-[0.16em] text-destiny-orange">
              Join us this Sunday
            </p>
            <h3 className="text-2xl font-bold text-destiny-black">
              11:00am · Destiny Centre · 395 Norton Road, TS20 2QQ
            </h3>
            <p className="text-sm text-destiny-grey">
              Kids, Youth, and coffee ready from 10:30am.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CTAButton href="/new-here">Plan your visit</CTAButton>
            <CTAButton href="/watch" variant="ghost">
              Watch online
            </CTAButton>
          </div>
        </div>
      </Section>

      <Section
        kicker="Watch"
        title="Latest message"
        description="Catch up on Sunday if you missed it, or rewatch a favourite."
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
          <CTAButton href="/watch" variant="ghost">
            Watch live options
          </CTAButton>
        </div>
      </Section>

      <Section
        kicker="Get connected"
        title="Take your next step"
        description="Find your people, join a team, or explore faith through Alpha."
      >
        <CardGrid columns={3}>
          <Card
            title="New here?"
            description="We’ll save you a seat, introduce you to a host, and help with parking and kids check-in."
            href="/new-here"
            cta="Plan a visit"
            backgroundImage="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1400&q=80"
            tone="dark"
            eyebrow="Start here"
          />
          <Card
            title="What’s on"
            description="See gatherings, courses, and community nights across the church."
            href="/whats-on"
            cta="View events"
            eyebrow="Calendar"
          />
          <Card
            title="Life Groups"
            description="Join a midweek group to grow in faith, find friends, and pray together."
            href="/connect"
            cta="Find a group"
            backgroundImage="https://images.unsplash.com/photo-1453873623425-04e3561289aa?auto=format&fit=crop&w=1400&q=80"
            tone="dark"
            eyebrow="Midweek"
          />
          <Card
            title="Serve & Teams"
            description="Use your gifts on worship, kids, host, production, or outreach teams."
            href="/connect"
            cta="Join a team"
            eyebrow="Teams"
            backgroundImage="https://destinytees.uk/wp-content/uploads/2023/06/Training_DC-scaled.jpg"
            tone="dark"
          />
          <Card
            title="Give"
            description="Partner with the vision through online giving, standing order, or Gift Aid."
            href="/give"
            cta="Give now"
            eyebrow="Generosity"
          />
          <Card
            title="Watch & listen"
            description="Catch up on the latest message or revisit the series you loved."
            href="/watch"
            cta="Start watching"
            backgroundImage="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80"
            tone="dark"
            eyebrow="Media"
          />
        </CardGrid>
      </Section>
    </div>
  );
}

function HighlightCard({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-sm text-white/85">{detail}</p>
    </div>
  );
}
