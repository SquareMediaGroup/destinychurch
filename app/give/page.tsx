import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function GivePage() {
  return (
    <div className="space-y-12">
      <Hero
        kicker="Give"
        title="Your generosity fuels the mission"
        subtitle="Thank you for partnering with Destiny to serve Teesside and share the hope of Jesus."
        backgroundImage="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1800&q=80"
        primaryAction={{
          label: "Give online",
          href: "https://destinytees.churchsuite.com/donate",
        }}
        secondaryAction={{
          label: "Set up standing order",
          href: "/contact",
          variant: "secondary",
        }}
      />

      <Section
        kicker="Ways to give"
        title="Choose what works for you"
        description="Every gift helps us serve our city, invest in the next generation, and send people to share Jesus."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Online giving"
            detail="Secure one-off or recurring gifts via ChurchSuite."
          />
          <InfoCard
            title="Standing order"
            detail="Set up monthly giving through your bank using the details below."
          />
          <InfoCard
            title="In person"
            detail="Use giving envelopes during the weekend worship experience and hand to the host team."
          />
          <InfoCard
            title="Text giving"
            detail="Text “DCTEES give” followed by the amount to 07380 307 800. Add “/mo” for monthly."
          />
        </div>
      </Section>

      <Section
        kicker="Give online"
        title="Give once or set up a recurring gift"
        description="Use our secure ChurchSuite form to give now or set up a monthly gift."
        spacing="tight"
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <iframe
            src="https://destinytees.churchsuite.com/donate"
            title="Destiny Church online giving form"
            className="h-[900px] w-full"
            loading="lazy"
          />
        </div>
        <div className="mt-3 text-xs text-destiny-grey">
          If the form doesn&apos;t load,{" "}
          <a
            href="https://destinytees.churchsuite.com/donate"
            className="font-semibold text-destiny-orange underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            open it in a new tab
          </a>
          .
        </div>
      </Section>

      <Section spacing="tight">
        <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="space-y-1">
            <p className="subheading text-xs font-semibold uppercase tracking-[0.16em] text-destiny-orange">
              Thank you
            </p>
            <h3 className="text-2xl font-bold text-destiny-black">
              Together we’re changing stories
            </h3>
            <p className="text-sm text-destiny-grey">
              Your generosity helps us love Stockton, equip the church, and reach the nations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CTAButton href="https://destinytees.churchsuite.com/donate">
              Give now
            </CTAButton>
            <CTAButton href="/contact" variant="ghost">
              Ask about Gift Aid
            </CTAButton>
          </div>
        </div>
      </Section>

      <Section
        kicker="Gift Aid"
        title="Add 25% at no extra cost"
        description="If you’re a UK taxpayer, Gift Aid lets us reclaim 25p for every £1 you give."
        spacing="tight"
      >
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-6 shadow-sm">
          <p className="text-sm text-destiny-grey">
            Tick the Gift Aid box when giving online, complete the online Gift Aid declaration, or ask a host on Sunday for a paper form. Thank you for investing in the vision.
          </p>
        </div>
      </Section>

      <Section
        kicker="Standing order"
        title="Give directly through your bank"
        description="Use these details to set up a one-off or monthly standing order."
        spacing="tight"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard title="Account name" detail="Destiny Church Tees Valley" />
          <InfoCard title="Sort code" detail="08-92-99" />
          <InfoCard title="Account number" detail="67397646" />
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
