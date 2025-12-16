import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function NewHerePage() {
  return (
    <div className="space-y-12">
      <Hero
        kicker="Plan your visit"
        title="We can’t wait to meet you"
        subtitle="Friendly faces at the door, great coffee, and space for the whole family. Let us know you’re coming and we’ll save you a seat."
        primaryAction={{ label: "Plan your visit", href: "/contact" }}
        secondaryAction={{
          label: "Find directions",
          href: "https://maps.google.com/?q=Destiny+Church+Tees+Valley,+395+Norton+Road,+Stockton,+TS20+2QQ",
          variant: "secondary",
        }}
        backgroundImage="https://images.unsplash.com/photo-1463415268136-e52a5af54519?auto=format&fit=crop&w=1800&q=80"
      />

      <Section
        kicker="The essentials"
        title="Everything you need to know"
        description="Arrive from 10:30am for coffee. Parking is free on-site with team members ready to help."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Service time" detail="Sundays · 11:00am" />
          <InfoCard
            title="Location"
            detail="Destiny Centre, 395 Norton Road, Stockton · TS20 2QQ"
          />
          <InfoCard title="Kids & Youth" detail="Kids Church + Youth every Sunday" />
        </div>
      </Section>

      <Section
        kicker="What to expect"
        title="A welcoming, relaxed Sunday"
        description="You’ll be greeted by our host team, shown to a seat, and offered help with Kids or Youth check-in."
      >
        <CardGrid columns={3}>
          <Card
            title="Warm welcome"
            description="Friendly hosts, clear signage, and someone to answer your questions from the moment you arrive."
            cta="Say hello"
            href="/contact"
            eyebrow="Hosts"
          />
          <Card
            title="Kids & Youth"
            description="Safe, fun spaces for every age: Little ones, primary, and secondary groups during the message."
            cta="Check-in details"
            href="/contact"
            eyebrow="Families"
          />
          <Card
            title="Stay around"
            description="Grab coffee after the gathering and meet the team. We’d love to hear your story."
            cta="Let us know"
            href="/contact"
            eyebrow="Community"
          />
        </CardGrid>
      </Section>

      <Section spacing="tight">
        <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="space-y-1">
            <p className="subheading text-xs font-semibold uppercase tracking-[0.16em] text-destiny-orange">
              New to Destiny?
            </p>
            <h3 className="text-2xl font-bold text-destiny-black">
              We’ll meet you at the door
            </h3>
            <p className="text-sm text-destiny-grey">
              Tell us you’re coming and we’ll connect you with the right people.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CTAButton href="/contact">Plan your visit</CTAButton>
            <CTAButton href="/watch" variant="ghost">
              Watch before you come
            </CTAButton>
          </div>
        </div>
      </Section>
    </div>
  );
}

function InfoCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destiny-grey/80">
        {title}
      </p>
      <p className="text-base font-semibold text-destiny-black">{detail}</p>
    </div>
  );
}
