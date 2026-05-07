import type { Metadata } from "next";
import AnimateIn from "@/components/AnimateIn";
import MinistriesGrid from "@/components/serve/MinistriesGrid";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Volunteer",
  description: "Join one of our serve teams at Destiny Church Tees Valley. Find your place in worship, kids ministry, hospitality, tech and more.",
  alternates: { canonical: "/volunteer" },
  openGraph: {
    title: "Volunteer | Destiny Church Tees Valley",
    description: "Discover how you can serve and make a difference. Join our worship, kids, hospitality or tech teams.",
    url: "https://destinytees.uk/volunteer",
  },
};

export default function VolunteerPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl py-[10rem] px-4 text-center"
          style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
        >
          <AnimateIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Get Involved
            </p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
              Volunteer with Us
            </h1>
            <p className="mx-auto max-w-2xl text-base text-white/60 md:text-lg">
              Everyone has something to offer. Whether you love music, working with kids, welcoming people or running tech — there&apos;s a place for you on one of our serve teams.
            </p>
          </AnimateIn>
        </section>
      </div>

      {/* Why Serve */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
              Why Serve?
            </h2>
            <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
              Serving is more than just helping out — it&apos;s about using your gifts to make a real difference. When you serve, you grow in your faith, build meaningful relationships and become part of something bigger than yourself.
            </p>
            <p className="text-base leading-relaxed text-destiny-grey/70">
              No experience needed. We&apos;ll train you, support you and walk alongside you every step of the way.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Teams Grid */}
      <MinistriesGrid />

      {/* How to Get Started */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              How to Get Started
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "contact_mail",
                title: "Get in Touch",
                body: "Fill out the form below or speak to a team leader after a service. Let us know which team interests you."
              },
              {
                icon: "groups",
                title: "Meet the Team",
                body: "Come along to a team meeting or shadow someone during a service. See what it's really like and ask any questions."
              },
              {
                icon: "celebration",
                title: "Start Serving",
                body: "Join the rota, get trained up and start making a difference. We'll support you every step of the way."
              }
            ].map((step, i) => (
              <AnimateIn key={step.title} delay={i * 80}>
                <div className="flex flex-col items-start rounded-3xl bg-white p-8 shadow-sm">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-3xl text-destiny-orange">{step.icon}</span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-destiny-grey">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{step.body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Ready to Join a Team?
            </h2>
            <p className="mb-8 text-base leading-relaxed text-destiny-grey/60">
              Let us know which team you&apos;re interested in and we&apos;ll get back to you with more information.
            </p>
            <a
              href="/connect-card"
              className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              <span className="material-symbols-rounded text-lg">edit_note</span>
              Fill Out Connect Card
            </a>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
