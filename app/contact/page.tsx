import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function ContactPage() {
  return (
    <div className="space-y-12">
      <Hero
        kicker="Contact"
        title="We’re here to help"
        subtitle="Questions, prayer requests, or planning your first visit? Reach out and our team will get back to you."
        backgroundImage="https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=1800&q=80"
        primaryAction={{
          label: "Email the team",
          href: "mailto:enquires@destinytees.uk",
        }}
        secondaryAction={{ label: "Plan your visit", href: "/new-here", variant: "secondary" }}
      />

      <Section
        kicker="Contact details"
        title="Get in touch or come and see us"
        description="We aim to reply within one working day. For urgent pastoral needs, chat to a leader on Sunday."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Email" detail="enquires@destinytees.uk" />
          <InfoCard title="Phone" detail="+44 (0) 1642 559 797" />
          <InfoCard
            title="Address"
            detail="Destiny Centre, 395 Norton Road, Norton, Stockton-on-Tees · TS20 2QQ"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CTAButton href="mailto:enquires@destinytees.uk">Email us</CTAButton>
          <CTAButton href="/new-here" variant="ghost">
            Plan a visit
          </CTAButton>
        </div>
      </Section>

      <Section
        kicker="Service time"
        title="Join us this Sunday"
        description="Doors open 10:30am for coffee. Kids check-in opens at 10:45am."
        spacing="tight"
      >
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-8">
          <p className="text-lg font-semibold text-destiny-black">
            Destiny Centre · 11:00am · 395 Norton Road, TS20 2QQ
          </p>
          <p className="text-sm text-destiny-grey">
            Free parking on-site and on surrounding streets. Hosts will guide you as you arrive.
          </p>
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
      <p className="text-sm font-semibold text-destiny-black">{detail}</p>
    </div>
  );
}
