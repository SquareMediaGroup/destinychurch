import type { Metadata } from "next";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import HelpAccordion from "@/components/help/HelpAccordion";

export const metadata: Metadata = {
  title: "Help",
  description: "Find answers to common questions about Destiny Church Tees Valley — visiting for the first time, services, kids & youth, giving, and more.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help | Destiny Church Tees Valley",
    description: "Answers to common questions about services, visiting, kids & youth, giving, and getting connected at Destiny Church.",
    url: "https://destinytees.uk/help",
  },
};

const quickLinks = [
  { icon: "directions_walk", label: "Plan Your Visit", href: "/visit", color: "#F58021" },
  { icon: "menu_book", label: "Watch Sermons", href: "/sermons", color: "#0857BA" },
  { icon: "child_care", label: "Destiny Kids", href: "/kids", color: "#F58021" },
  { icon: "bolt", label: "Destiny Youth", href: "/youth", color: "#8106B1" },
  { icon: "favorite", label: "Alpha Course", href: "/alpha", color: "#FD0000" },
  { icon: "handshake", label: "Serve With Us", href: "/serve", color: "#028002" },
  { icon: "volunteer_activism", label: "Give", href: "/give", color: "#F58021" },
  { icon: "mail", label: "Contact Us", href: "/contact", color: "#363F48" },
];

const categories = [
  {
    icon: "waving_hand",
    label: "First Visit",
    color: "#F58021",
    faqs: [
      {
        q: "What time does the Sunday service start?",
        a: "Our main Sunday service runs from 11:00am to approximately 12:30pm. We also hold a Prayer Service from 10:00am to 10:30am. Doors open from 9:45am so you can arrive early, settle in and grab a coffee.",
      },
      {
        q: "Where are you located?",
        a: "We meet at Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ. Free on-site parking is available. Our Welcome Team will be glad to help when you arrive.",
      },
      {
        q: "What should I wear?",
        a: "Come as you are — seriously. You'll see everything from jeans and trainers to Sunday best. There's no dress code and no judgement.",
      },
      {
        q: "Do I need to book or register?",
        a: "No booking needed — just show up. If you'd like to let us know you're coming for the first time, you're welcome to fill in our Connect form so we can give you a proper welcome.",
      },
      {
        q: "What happens during the service?",
        a: "Services last around 90 minutes and include contemporary worship, Bible-based teaching, prayer, and time to connect with people afterwards over coffee. It's relaxed and welcoming — come ready to enjoy it.",
      },
      {
        q: "Is the building accessible?",
        a: "Yes. Destiny Centre has step-free access, accessible toilets, and BSL interpretation available. If you have specific accessibility requirements, please contact us in advance and we'll do everything we can to help.",
      },
    ],
  },
  {
    icon: "calendar_month",
    label: "Services",
    color: "#0857BA",
    faqs: [
      {
        q: "Are there services on public holidays?",
        a: "We typically meet every Sunday of the year including most public holidays. Occasionally we may adjust times over Christmas or Easter — follow us on social media or check the What's On page for any changes.",
      },
      {
        q: "Is there a midweek service?",
        a: "Yes — we hold a midweek prayer meeting. Check the What's On page for current times and details.",
      },
      {
        q: "Can I watch services online?",
        a: "Yes! Our services are streamed live on YouTube and Facebook every Sunday. Recordings are also uploaded to our Sermons page shortly after each service.",
      },
      {
        q: "Is there a prayer service before the main service?",
        a: "Yes, we hold a Prayer Service from 10:00am to 10:30am every Sunday, before the main 11:00am service. Everyone is welcome.",
      },
    ],
  },
  {
    icon: "child_care",
    label: "Kids & Youth",
    color: "#8106B1",
    faqs: [
      {
        q: "What provision is there for children?",
        a: "Destiny Kids runs every Sunday from 10:45am for children aged 0–11. Age-appropriate classes cover babies through to Year 6 — packed with stories, crafts, games and worship. All leaders are DBS-checked and trained.",
      },
      {
        q: "What about teenagers?",
        a: "Destiny Youth meets every Wednesday at 7pm for young people aged 11–18. There are groups for KS3, KS4 and KS5 — energetic, welcoming and rooted in faith.",
      },
      {
        q: "Is there anything for young adults?",
        a: "Yes — our Young Adults community is for those in their 18s–30s. There are events, meals, Connect Groups and life together throughout the year.",
      },
      {
        q: "How do I register my child for Destiny Kids?",
        a: "There's no pre-registration needed for your first visit. When you arrive, our Welcome Team will point you to the Kids sign-in desk. After your first visit you can register through the ChurchSuite system.",
      },
      {
        q: "Are children's leaders DBS checked?",
        a: "Yes. All Destiny Kids and Youth leaders are DBS-checked, safeguarding trained, and follow our full Safeguarding Policy. You can read more on our Safeguarding page.",
      },
    ],
  },
  {
    icon: "group",
    label: "Getting Involved",
    color: "#028002",
    faqs: [
      {
        q: "How do I join a Connect Group?",
        a: "Connect Groups are small gatherings that meet throughout the week in homes across the Tees Valley. Visit our Connect page to browse groups and register your interest.",
      },
      {
        q: "How can I serve at church?",
        a: "We have teams in worship, kids, youth, hosting, tech, cafe, and more. Visit the Serve page to see what's available and express your interest.",
      },
      {
        q: "What is Alpha?",
        a: "Alpha is a free, no-pressure course that explores the big questions of life and faith — held over several weeks. It's a great place to start or to invite a friend who's curious. Visit our Alpha page for upcoming dates.",
      },
      {
        q: "How do I fill in a Connect Card?",
        a: "You can fill in a Connect Card online at destinytees.uk/connect-card, or pick one up at the Welcome Desk on a Sunday. It's the best way to introduce yourself and let us know how we can help.",
      },
    ],
  },
  {
    icon: "play_circle",
    label: "Online & Media",
    color: "#0857BA",
    faqs: [
      {
        q: "Where can I watch sermons online?",
        a: "All sermons are available on our Sermons page. You can filter by speaker, series, or date. We also upload to YouTube — search 'Destiny Church Tees Valley'.",
      },
      {
        q: "Where can I follow Destiny Church on social media?",
        a: "Find us on Facebook and Instagram @destinychurchteesvalley, and on YouTube @DestinyChurchTeesValley.",
      },
      {
        q: "Is there a church app?",
        a: "We use ChurchSuite for giving, event bookings and group management. You can access it via browser at destinytees.churchsuite.com. A dedicated Destiny app is not currently available.",
      },
    ],
  },
  {
    icon: "volunteer_activism",
    label: "Giving",
    color: "#F58021",
    faqs: [
      {
        q: "How can I give to Destiny Church?",
        a: "You can give online at any time via our Give page using a card or bank transfer. You can also give in person on Sundays at the giving points in the venue.",
      },
      {
        q: "Can I set up a regular gift?",
        a: "Yes — our Give page lets you set up a one-off or regular gift via ChurchSuite. Regular giving helps us plan and serve the community well.",
      },
      {
        q: "Is Gift Aid available?",
        a: "Yes. If you are a UK taxpayer, your giving can be boosted by 25% through Gift Aid at no extra cost to you. You can indicate this when giving online or speak to the office.",
      },
    ],
  },
  {
    icon: "lock",
    label: "Privacy & Legal",
    color: "#363F48",
    faqs: [
      {
        q: "How does Destiny Church use my data?",
        a: "We take your privacy seriously. Any data collected through this website or ChurchSuite is used solely for church communication and administration. Read our full Privacy Policy for details.",
      },
      {
        q: "How do I request deletion of my data?",
        a: "You can request that your data be deleted by emailing admin@destinytees.uk. We will process your request in accordance with UK GDPR.",
      },
      {
        q: "Does the site use cookies?",
        a: "Yes — we use cookies for analytics (with your consent) and for essential site functions. You can manage your cookie preferences via the banner shown on your first visit, or by contacting us.",
      },
    ],
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: categories.flatMap((cat) =>
    cat.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    }))
  ),
};

export default function HelpPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl py-[10rem] px-4 text-center"
          style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
        >
          <AnimateIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              We&apos;re Here to Help
            </p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
              Help Centre
            </h1>
            <p className="mx-auto max-w-xl text-base text-white/60 md:text-lg">
              Find answers to common questions, or get in touch and we&apos;ll point you in the right direction.
            </p>
          </AnimateIn>
        </section>
      </div>

      {/* Quick links */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Quick Links
            </h2>
            <p className="mb-10 text-center text-sm text-destiny-grey/50">
              Jump straight to what you need
            </p>
          </AnimateIn>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {quickLinks.map((link, i) => (
              <AnimateIn key={link.href} delay={i * 40}>
                <Link
                  href={link.href}
                  className="group flex flex-col items-center gap-3 rounded-3xl bg-[#f5f7fa] p-6 text-center transition hover:bg-destiny-orange/5 hover:shadow-sm"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-110"
                    style={{ background: `${link.color}18` }}
                  >
                    <span
                      className="material-symbols-rounded text-2xl"
                      style={{ color: link.color }}
                    >
                      {link.icon}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-destiny-grey group-hover:text-destiny-orange transition">
                    {link.label}
                  </span>
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Common Questions
            </p>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Frequently Asked
            </h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">
              Browse by topic, or contact us if you can&apos;t find what you&apos;re looking for
            </p>
          </AnimateIn>
          <AnimateIn delay={80}>
            <HelpAccordion categories={categories} />
          </AnimateIn>
        </div>
      </section>

      {/* Still need help CTA */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8 text-center">
          <AnimateIn>
            <div
              className="rounded-3xl px-8 py-14"
              style={{ background: "linear-gradient(135deg, #f58021 0%, #d96d10 100%)" }}
            >
              <span className="material-symbols-rounded mb-4 block text-5xl text-white/80">
                support_agent
              </span>
              <h2 className="mb-3 text-3xl font-black text-white md:text-4xl">
                Still need help?
              </h2>
              <p className="mb-8 text-base text-white/70">
                Can&apos;t find the answer you&apos;re looking for? Our team are happy to help — just reach out.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-destiny-orange shadow-sm transition hover:bg-white/90"
                >
                  <span className="material-symbols-rounded text-lg">mail</span>
                  Send a Message
                </Link>
                <a
                  href="tel:+441642559797"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-7 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  <span className="material-symbols-rounded text-lg">call</span>
                  01642 559 797
                </a>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
