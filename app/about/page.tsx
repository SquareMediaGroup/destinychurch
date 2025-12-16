import Image from "next/image";
import Card from "@/components/Card";
import CardGrid from "@/components/CardGrid";
import CTAButton from "@/components/CTAButton";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export default function AboutPage() {
  const pillars = [
    {
      title: "Magnify",
      description:
        "We love God passionately and enjoy worshipping Him—Jesus first in everything.",
      cta: "Join us",
      href: "/watch",
      eyebrow: "Worship",
      icon: "https://destinytees.uk/wp-content/uploads/2022/11/Magnify_nb.png",
      accentLabel: "Love God first",
      color: "#FD0000",
      background: "rgba(253,0,0,0.08)",
      border: "rgba(253,0,0,0.22)",
      glow: "0 0 0 4px rgba(253,0,0,0.16)",
    },
    {
      title: "Mission",
      description:
        "We share the life-transforming message of Jesus with every person in Teesside and beyond.",
      cta: "Serve with us",
      href: "/connect",
      eyebrow: "Reach",
      icon: "https://destinytees.uk/wp-content/uploads/2022/11/Mission_nb.png",
      accentLabel: "Go & make disciples",
      color: "#F58021",
      background: "rgba(245,128,33,0.1)",
      border: "rgba(245,128,33,0.25)",
      glow: "0 0 0 4px rgba(245,128,33,0.18)",
    },
    {
      title: "Ministry",
      description:
        "Every believer is called to minister. Discover your S.H.A.P.E. and make a difference.",
      cta: "Use your gifts",
      href: "/connect",
      eyebrow: "Serve",
      icon: "https://destinytees.uk/wp-content/uploads/2022/11/Ministry_nb.png",
      accentLabel: "Everyone has a part",
      color: "#8106B1",
      background: "rgba(129,6,177,0.1)",
      border: "rgba(129,6,177,0.25)",
      glow: "0 0 0 4px rgba(129,6,177,0.18)",
    },
    {
      title: "Membership",
      description:
        "We belong together—Connect Groups help us do more, be more, and endure more.",
      cta: "Find a group",
      href: "/connect",
      eyebrow: "Community",
      icon: "https://destinytees.uk/wp-content/uploads/2022/11/Membership_nb.png",
      accentLabel: "Family on mission",
      color: "#0857BA",
      background: "rgba(8,87,186,0.1)",
      border: "rgba(8,87,186,0.25)",
      glow: "0 0 0 4px rgba(8,87,186,0.18)",
    },
    {
      title: "Maturity",
      description:
        "We grow to be like Jesus in character, convictions, conduct, and conversation.",
      cta: "Grow with us",
      href: "/connect",
      eyebrow: "Discipleship",
      icon: "https://destinytees.uk/wp-content/uploads/2022/11/Maturity_nb.png",
      accentLabel: "Becoming like Jesus",
      color: "#028002",
      background: "rgba(2,128,2,0.1)",
      border: "rgba(2,128,2,0.25)",
      glow: "0 0 0 4px rgba(2,128,2,0.18)",
    },
  ];

  const seniorLeaders = [
    {
      name: "Jonathan Harris",
      role: "Senior Pastor",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/JH.png",
      email: "jonathan@destinytees.uk",
    },
    {
      name: "Faith Moradi",
      role: "Associate Pastor",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/FH.png",
      email: "faith@destinytees.uk",
    },
    {
      name: "Tracy Reddy",
      role: "Pastor, Small Groups",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/TR.png",
      email: "tracy@destinytees.uk",
    },
    {
      name: "Deveshin Reddy",
      role: "Pastor, Finances & Facilities",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/DR.png",
      email: "deveshin@destinytees.uk",
    },
    {
      name: "Nkereuwem Ekanem",
      role: "Pastor, Creativity & Innovation",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/NE.png",
      email: "nk@destinytees.uk",
    },
  ];

  const departmentHeads = [
    {
      name: "Funke Awojide",
      role: "Children's Pastor",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/FA.png",
      email: "funke@destinytees.uk",
    },
    {
      name: "Adebowale Awojide",
      role: "Prayer Team",
      photo: "https://destinytees.uk/wp-content/uploads/2025/02/Debo.png",
      email: "debo@destinytees.uk",
    },
    {
      name: "Younes Moradi",
      role: "Site & Stewarding Team",
      photo: "",
      email: "younes@destinytees.uk",
    },
    {
      name: "David Bayode",
      role: "Worship Team",
      photo: "",
      email: "david@destinytees.uk",
    },
  ];

  return (
    <div className="space-y-12">
      <Hero
        kicker="About"
        title="Christ-centred, Bible-believing, people-loving"
        subtitle="Destiny Church exists to bring people to Jesus, grow them to maturity, equip them for ministry, and send them on mission."
        backgroundImage="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1800&q=80"
        primaryAction={{ label: "Plan your visit", href: "/new-here" }}
        secondaryAction={{ label: "Explore our values", href: "#values", variant: "secondary" }}
      />

      <Section
        kicker="Our story"
        title="Rooted in Stockton, reaching the North East"
        description="Built on the Great Commandment and the Great Commission, our vision is transforming lives through faith, hope, and love for Jesus."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-destiny-black">
              What drives us
            </h3>
            <ul className="space-y-3 text-sm text-destiny-grey">
              <li>• Bringing people to Jesus and membership of His family.</li>
              <li>• Developing believers to maturity in Christ.</li>
              <li>• Equipping everyone for their ministry in the Church and mission in the world.</li>
              <li>• Worshipping God wholeheartedly—Magnify.</li>
              <li>• Loving Teesside with practical compassion—Mission.</li>
            </ul>
          </div>
          <div className="space-y-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-6">
            <h3 className="text-xl font-semibold text-destiny-black">
              Sundays and beyond
            </h3>
            <p className="text-sm text-destiny-grey">
              We gather every Sunday at 11:00am for worship, teaching, and prayer. Midweek we meet in Connect Groups across Teesside, run Alpha, and serve through teams and community outreach.
            </p>
            <CTAButton href="/connect" variant="ghost">
              See how to get involved
            </CTAButton>
          </div>
        </div>
      </Section>

      <Section
        id="values"
        kicker="Values"
        title="How we live this out"
        description="Our five pillars shape the way we treat each other and our city."
      >
        <CardGrid columns={3}>
          {pillars.map((pillar) => (
            <Card
              key={pillar.title}
              title={pillar.title}
              description={pillar.description}
              cta={pillar.cta}
              href={pillar.href}
              eyebrow={pillar.eyebrow}
            >
              <div
                className="flex items-center gap-3 rounded-xl border px-3 py-2"
                style={{
                  backgroundColor: pillar.background,
                  borderColor: pillar.border,
                }}
              >
                <div
                  className="relative h-10 w-10 overflow-hidden rounded-full bg-white"
                  style={{ boxShadow: pillar.glow }}
                >
                  <Image
                    src={pillar.icon}
                    alt={pillar.title}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: pillar.color }}
                >
                  {pillar.accentLabel}
                </span>
              </div>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section
        kicker="Leadership"
        title="Senior Leadership Team"
        description="Meet the pastors serving and guiding Destiny Church Tees Valley."
      >
        <CardGrid columns={3}>
          {seniorLeaders.map((leader) => (
            <PersonCard key={leader.name} person={leader} />
          ))}
        </CardGrid>
      </Section>

      <Section
        kicker="Department Heads"
        title="Teams that keep Destiny moving"
        description="Leaders who champion our ministries across Sundays and midweek."
      >
        <CardGrid columns={4}>
          {departmentHeads.map((leader) => (
            <PersonCard key={leader.name} person={leader} />
          ))}
        </CardGrid>
      </Section>

      <Section
        align="center"
        kicker="Plan a visit"
        title="Find us in Stockton-on-Tees"
        description="Use the map to plan your route to Destiny Centre—we can’t wait to welcome you."
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-sm">
          <iframe
            title="Destiny Church Stockton-on-Tees location"
            width="100%"
            height="700"
            frameBorder="0"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBP7PzJ9_70tHkiN-V-gcxI6Y56Yr1ZM94&q=Destiny+Church+stockton-on-tees"
            allowFullScreen
          />
        </div>
      </Section>
    </div>
  );
}

type Person = {
  name: string;
  role: string;
  photo?: string;
  email?: string;
};

function PersonCard({ person }: { person: Person }) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-72 w-full overflow-hidden rounded-t-2xl bg-gradient-to-b from-[var(--surface-muted)] to-[var(--surface)] flex items-center justify-center">
        {person.photo ? (
          <Image
            src={person.photo}
            alt={person.name}
            fill
            sizes="320px"
            className="object-contain p-4 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-destiny-orange/20 via-destiny-blue/10 to-destiny-purple/15 text-xl font-bold text-[var(--foreground)]/80">
            {initials}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <p className="text-base font-semibold text-[var(--foreground)]">
          {person.name}
        </p>
        <p className="text-sm text-[var(--foreground)]/70">{person.role}</p>
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="text-sm font-semibold text-destiny-orange hover:underline"
          >
            {person.email}
          </a>
        )}
      </div>
    </div>
  );
}
