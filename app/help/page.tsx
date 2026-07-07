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
  { index: "01", icon: "directions_walk", label: "Plan Your Visit", href: "/visit" },
  { index: "02", icon: "menu_book", label: "Watch Sermons", href: "/sermons" },
  { index: "03", icon: "child_care", label: "Destiny Kids", href: "/kids" },
  { index: "04", icon: "bolt", label: "Destiny Youth", href: "/youth" },
  { index: "05", icon: "favorite", label: "Alpha Course", href: "/alpha" },
  { index: "06", icon: "handshake", label: "Serve With Us", href: "/serve" },
  { index: "07", icon: "volunteer_activism", label: "Give", href: "/give" },
  { index: "08", icon: "mail", label: "Contact Us", href: "/contact" },
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
    <div className="help-page relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* page-scoped styling — shared visual language with /links */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .help-page {
              background-color: #ffffff;
              background-image:
                radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.08), transparent 60%),
                radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.05), transparent 55%);
            }
            @keyframes help-rise {
              from { opacity: 0; transform: translateY(28px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes help-draw {
              from { transform: scaleX(0); }
              to   { transform: scaleX(1); }
            }
            .help-reveal {
              opacity: 0;
              animation: help-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .help-rule {
              transform-origin: left;
              animation: help-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .step-card {
              transition: transform 0.45s cubic-bezier(0.16,1,0.3,1),
                          box-shadow 0.45s ease,
                          border-color 0.45s ease;
            }
            .step-card .step-fill {
              transform: scaleY(0);
              transform-origin: bottom;
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .step-card:hover,
            .step-card:focus-visible {
              transform: translateY(-6px);
              border-color: #f58021;
              box-shadow: 0 24px 50px -20px rgba(245,128,33,0.45);
            }
            .step-card:hover .step-fill,
            .step-card:focus-visible .step-fill { transform: scaleY(1); }
            .step-card .step-num,
            .step-card .step-title,
            .step-card .step-arrow,
            .step-card .step-icon {
              transition: color 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1);
            }
            .step-card:hover .step-num,
            .step-card:focus-visible .step-num { color: rgba(255,255,255,0.85); }
            .step-card:hover .step-title,
            .step-card:focus-visible .step-title,
            .step-card:hover .step-icon,
            .step-card:focus-visible .step-icon { color: #ffffff; }
            .step-card:hover .step-arrow,
            .step-card:focus-visible .step-arrow {
              color: #ffffff;
              transform: translateX(6px);
            }
            .step-card:hover .step-icon,
            .step-card:focus-visible .step-icon { transform: rotate(-4deg) scale(1.05); }
            @media (prefers-reduced-motion: reduce) {
              .help-reveal, .help-rule { animation: none; opacity: 1; transform: none; }
              .step-card, .step-card * { transition: none !important; }
            }
          `,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-16 sm:px-8 lg:pt-24">
        {/* Masthead */}
        <header className="mb-12 lg:mb-16">
          <h1 className="leading-[0.92]">
            <span
              className="help-reveal block font-[family-name:var(--font-playfair)] text-4xl italic text-destiny-grey/80 sm:text-5xl"
              style={{ animationDelay: "0.05s" }}
            >
              How can we
            </span>
            <span
              className="help-reveal mt-2 block font-[family-name:var(--font-anton)] text-[18vw] uppercase tracking-tight text-destiny-grey sm:mt-3 sm:text-[9.5rem] lg:text-[11.5rem]"
              style={{ animationDelay: "0.12s" }}
            >
              Help You?
            </span>
          </h1>

          <div
            className="help-rule mt-8 h-1 w-24 rounded-full bg-destiny-orange"
            style={{ animationDelay: "0.2s" }}
          />

          <p
            className="help-reveal mt-6 max-w-xl text-base text-destiny-grey/55 sm:text-lg"
            style={{ animationDelay: "0.26s" }}
          >
            Find answers to common questions, or get in touch and we&apos;ll
            point you in the right direction.
          </p>
        </header>

        {/* Quick links — compact step cards */}
        <nav aria-label="Quick links">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {quickLinks.map((link, i) => (
              <li
                key={link.href}
                className="help-reveal"
                style={{ animationDelay: `${0.32 + i * 0.05}s` }}
              >
                <Link
                  href={link.href}
                  className="step-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-5 outline-none"
                >
                  {/* orange fill on hover */}
                  <span
                    aria-hidden
                    className="step-fill absolute inset-0 bg-destiny-orange"
                  />

                  <div className="relative flex items-start justify-between">
                    <span className="step-num font-[family-name:var(--font-anton)] text-lg text-destiny-orange">
                      {link.index}
                    </span>
                    <span
                      aria-hidden
                      className="material-symbols-rounded step-icon text-2xl text-destiny-grey/30"
                    >
                      {link.icon}
                    </span>
                  </div>

                  <div className="relative mt-8 flex items-end justify-between gap-2">
                    <span className="step-title min-w-0 font-[family-name:var(--font-heading)] text-sm font-black leading-tight text-destiny-grey sm:text-base">
                      {link.label}
                    </span>
                    <span className="material-symbols-rounded step-arrow shrink-0 text-xl text-destiny-grey/40">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* FAQ accordion */}
        <section className="mt-20 sm:mt-24">
          <AnimateIn>
            <header className="mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">
                Common Questions
              </p>
              <h2 className="mt-2 leading-[0.95]">
                <span className="block font-[family-name:var(--font-playfair)] text-2xl italic text-destiny-grey/70 sm:text-3xl">
                  Frequently
                </span>
                <span className="block font-[family-name:var(--font-anton)] text-5xl uppercase tracking-tight text-destiny-grey sm:text-6xl">
                  Asked
                </span>
              </h2>
              <p className="mt-4 max-w-xl text-sm text-destiny-grey/55 sm:text-base">
                Browse by topic, or contact us if you can&apos;t find what
                you&apos;re looking for.
              </p>
            </header>
          </AnimateIn>
          <AnimateIn delay={80}>
            <HelpAccordion categories={categories} />
          </AnimateIn>
        </section>

        {/* Still need help CTA */}
        <AnimateIn delay={40}>
          <div className="mt-16 overflow-hidden rounded-3xl bg-destiny-grey px-7 py-10 sm:mt-20 sm:px-12 sm:py-12">
            <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">
                  We&apos;re Here to Help
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-black text-white sm:text-3xl">
                  Still need help?
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/60">
                  Can&apos;t find the answer you&apos;re looking for? Our team
                  are happy to help — just reach out.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03] hover:bg-destiny-orange-dark"
                >
                  Send a Message
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </Link>
                <Link
                  href="/destiny-ai"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  <span className="material-symbols-rounded text-lg">auto_awesome</span>
                  Ask Destiny AI
                </Link>
                <a
                  href="tel:+441642559797"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  <span className="material-symbols-rounded text-lg">call</span>
                  Or call 01642 559 797
                </a>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
