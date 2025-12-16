import Image from "next/image";
import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function ConnectPage() {
  return (
    <div className="space-y-12">
      <Hero
        kicker="Connect"
        title="Find your people, live your calling"
        subtitle="Groups, teams, Alpha, and spaces to belong. We’ll help you take a confident next step."
        backgroundImage="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1800&q=80"
        primaryAction={{ label: "Join a Life Group", href: "#groups" }}
        secondaryAction={{ label: "Talk to a pastor", href: "/contact", variant: "secondary" }}
      />

      <Section
        id="groups"
        kicker="Life Groups"
        title="Smaller circles, deeper friendships"
        description="Groups meet across Teesside during the week to pray, study Scripture, and share life."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoTile label="When" value="Weeknights across Teesside" />
          <InfoTile label="Style" value="Bible study, prayer, food, conversation" />
          <InfoTile label="Who" value="Everyone welcome—families, students, professionals" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CTAButton href="/contact">Find a nearby group</CTAButton>
          <CTAButton href="/new-here" variant="ghost">
            Visit on Sunday first
          </CTAButton>
        </div>
      </Section>

      <Section
        kicker="Teams"
        title="Serve with purpose"
        description="Use your Spiritual gifts, Heart, Abilities, Personality, and Experience (S.H.A.P.E.) on teams that make Destiny feel like home."
      >
        <CardGrid columns={3}>
          <Card
            title="Host & Hospitality"
            description="Welcome guests, make coffee, and create a warm Sunday experience."
            cta="Join host team"
            href="/contact"
            eyebrow="Front door"
          />
          <Card
            title="Worship & Production"
            description="Lead worship, play in the band, run sound, cameras, or livestream."
            cta="Audition or shadow"
            href="/contact"
            eyebrow="Creative"
          />
          <Card
            title="Kids & Youth"
            description="Invest in the next generation with safe, fun, Bible-based programmes."
            cta="Start serving"
            href="/contact"
            eyebrow="Families"
          />
          <Card
            title="Alpha"
            description="Host, facilitate, or cook for Alpha. Make space for honest faith conversations."
            cta="Help with Alpha"
            href="/contact"
            eyebrow="Conversation"
          />
          <Card
            title="Community outreach"
            description="Serve Stockton through practical help, compassion, and partnerships."
            cta="Get involved"
            href="/contact"
            eyebrow="Outreach"
          />
          <Card
            title="Prayer & pastoral"
            description="Pray with people, follow up, and support pastoral care alongside the team."
            cta="Talk with us"
            href="/contact"
            eyebrow="Care"
          />
        </CardGrid>
      </Section>

      <Section
        kicker="Alpha"
        title="Explore faith with Alpha"
        description="Share a meal, watch a short film, and ask your questions in a relaxed space."
      >
        <CardGrid columns={2}>
          <Card
            title="Alpha course"
            description="Join us for eleven weeks of conversation about life, faith, and meaning."
            href="/contact"
            cta="Register interest"
            backgroundImage="https://destinytees.uk/wp-content/uploads/2023/08/churchslides.png"
            tone="dark"
            eyebrow="Next course"
          />
          <Card
            title="Invite a friend"
            description="Save a seat for someone you love. We’ll have food ready and hosts to welcome you."
            href="/contact"
            cta="Invite someone"
            backgroundImage="https://destinytees.uk/wp-content/uploads/2023/08/churchslides.png"
            tone="dark"
            eyebrow="Bring someone"
          />
        </CardGrid>
      </Section>

      <Section
        kicker="Stay connected"
        title="Tools that keep us together"
        description="Download YouVersion, set Destiny as your church, and grab a connect card."
      >
        <CardGrid columns={3}>
          <Card
            title="Follow us on YouVersion"
            description="Add Destiny Church Tees Valley in the YouVersion Bible app to follow plans and notes."
            href="https://www.bible.com/app"
            cta="Get the app"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-xl">
              <Image
                src="https://destinytees.uk/wp-content/uploads/2023/02/Download-YouVersion-Slide.jpg"
                alt="YouVersion Bible app"
                fill
                sizes="400px"
                className="object-cover"
              />
            </div>
          </Card>
          <Card
            title="Set Destiny as your church"
            description="Choose Destiny in YouVersion to get updates and shared reading plans."
            href="https://www.bible.com/app"
            cta="Set my church"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-xl">
              <Image
                src="https://destinytees.uk/wp-content/uploads/2023/02/Set-As-My-Church-Slide.jpg"
                alt="Set Destiny as my church"
                fill
                sizes="400px"
                className="object-cover"
              />
            </div>
          </Card>
          <Card
            title="Fill a connect card"
            description="Share your details and how we can help—teams will follow up with next steps."
            href="/contact"
            cta="Fill a card"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-xl bg-[var(--surface-muted)]">
              <Image
                src="https://destinytees.uk/wp-content/uploads/2023/10/Connect-cards.pngf_.png"
                alt="Connect cards"
                fill
                sizes="400px"
                className="object-contain"
              />
            </div>
          </Card>
        </CardGrid>
      </Section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destiny-grey/80">
        {label}
      </p>
      <p className="text-sm font-semibold text-destiny-black">{value}</p>
    </div>
  );
}
