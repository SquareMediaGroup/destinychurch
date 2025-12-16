import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function WhatsOnPage() {
  return (
    <div className="space-y-12">
      <Hero
        kicker="What’s on"
        title="Gather, grow, and belong"
        subtitle="Here’s what’s coming up at Destiny Church. Find your next step, invite a friend, and join us in person or online."
        primaryAction={{ label: "Plan your visit", href: "/new-here" }}
        secondaryAction={{ label: "Contact the team", href: "/contact" }}
        backgroundImage="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1800&q=80"
      />

      <Section
        kicker="Featured"
        title="Highlighted gatherings"
        description="A quick look at the biggest things happening across Destiny over the next few weeks."
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <iframe
            src="https://destinytees.churchsuite.com/embed/calendar/events?layout=grid&show_search=1&featured=1"
            title="Destiny Church events"
            className="w-full bg-white"
            height="1000"
            frameBorder="0"
            scrolling="yes"
            style={{ borderWidth: 0 }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--foreground)]/70">
          Can’t see what you’re looking for?{" "}
          <a
            href="https://destinytees.churchsuite.com/events"
            className="font-semibold text-destiny-orange underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open the full calendar
          </a>{" "}
          or email enquires@destinytees.uk.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-5">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-destiny-black">
              Want to add an event?
            </p>
            <p className="text-sm text-[var(--foreground)]/75">
              Email enquires@destinytees.uk and the team will help you share it.
            </p>
          </div>
          <CTAButton href="/contact" variant="ghost">
            Contact us
          </CTAButton>
        </div>
      </Section>
    </div>
  );
}
