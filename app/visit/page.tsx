import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import VisitSlideshow from "@/components/visit/VisitSlideshow";

export const metadata: Metadata = {
  title: "Plan Your Visit",
  description: "Everything you need to know before visiting Destiny Church. We meet every Sunday at 11am at Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ. Free parking.",
  alternates: { canonical: "/visit" },
  openGraph: {
    title: "Plan Your Visit | Destiny Church Tees Valley",
    description: "Sunday 11am at Destiny Centre, Norton Road, Stockton-on-Tees. Free parking, BSL available, kids provision from 10:45am.",
    url: "https://destinytees.uk/visit",
  },
};

const whatToExpect = [
  {
    icon: "music_note",
    title: "Worship",
    body: "We start with uplifting, contemporary worship music — sung together as a church family. Come ready to engage, or just take it in.",
  },
  {
    icon: "menu_book",
    title: "Bible Teaching",
    body: "Our sermons are Bible-based, relevant and practical. Whether you've been a Christian for decades or never opened a Bible, there's something for you.",
  },
  {
    icon: "volunteer_activism",
    title: "Prayer",
    body: "We believe prayer makes a difference. There's space in every service to respond — whether publicly or quietly in your own heart.",
  },
  {
    icon: "waving_hand",
    title: "Community",
    body: "After the service we hang around, grab a coffee and catch up. It's one of the best parts of the week. You're always welcome to join us.",
  },
];

const faqs = [
  {
    q: "What time does the service start?",
    a: "Our main Sunday service runs from 11:00am to approximately 12:30pm. We also hold a Prayer Service from 10:00am to 10:30am. Doors open from 9:45am so you can arrive early, settle in and grab a coffee.",
  },
  {
    q: "What should I wear?",
    a: "Come as you are — seriously. You'll see everything from jeans and trainers to Sunday best. There's no dress code, no judgement.",
  },
  {
    q: "Is there parking?",
    a: "Yes — free parking is available on site at Destiny Centre. There's plenty of space, and our Welcome Team will be happy to point you in the right direction.",
  },
  {
    q: "What about my children?",
    a: "Destiny Kids runs every Sunday from 10:45am to 12:30pm for children aged 0–11. All leaders are DBS-checked and trained. Children are warmly welcomed into the service and head out to their classes during the gathering.",
  },
  {
    q: "Do I need to book or register?",
    a: "No booking needed — just show up. If you'd like to let us know you're coming for the first time, you're welcome to fill in our Connect form so we can give you a proper welcome.",
  },
  {
    q: "Is the building accessible?",
    a: "Yes. Destiny Centre has step-free access, accessible toilets and BSL interpretation available. If you have specific accessibility requirements, please contact us in advance and we'll do everything we can to help.",
  },
  {
    q: "What if I have questions about faith?",
    a: "Brilliant — bring them. Whether you've got doubts, curiosity or you're exploring faith for the first time, you're in the right place. You might also want to check out our Alpha course.",
  },
];

export default function VisitPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Plan a Visit.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">You&apos;re Welcome Here</p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Plan Your Visit</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                Everything you need to know before you walk through the doors.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Service info cards */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">When & Where</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">We meet every Sunday — and we&apos;d love to see you there</p>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-3">
            <AnimateIn delay={0}>
              <div className="flex items-start gap-4 rounded-3xl bg-[#f5f7fa] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">calendar_month</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Every Sunday</p>
                  <p className="text-sm text-destiny-grey/70">Main Service: 11:00am – 12:30pm</p>
                  <p className="mt-1 text-sm text-destiny-grey/70">Prayer Service: 10:00am – 10:30am</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">Doors open from 9:45am</p>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={80}>
              <div className="flex items-start gap-4 rounded-3xl bg-[#f5f7fa] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">location_on</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Destiny Centre</p>
                  <p className="text-sm text-destiny-grey/70">Norton Road</p>
                  <p className="text-sm text-destiny-grey/70">Stockton-on-Tees</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">TS20 2QQ</p>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={160}>
              <div className="flex items-start gap-4 rounded-3xl bg-[#f5f7fa] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">local_parking</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Free Parking</p>
                  <p className="text-sm text-destiny-grey/70">On-site car park</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">Step-free access available</p>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">What Happens</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">What to expect on a Sunday</h2>
              <p className="mb-8 text-base leading-relaxed text-destiny-grey/70">
                Whether it&apos;s your first time in a church or your hundredth, we want you to feel at home. Our Sunday services last around 90 minutes and are relaxed, warm and welcoming.
              </p>
              <div className="grid gap-5">
                {whatToExpect.map((item, i) => (
                  <AnimateIn key={item.title} delay={i * 60}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                        <span className="material-symbols-rounded text-xl text-destiny-orange">{item.icon}</span>
                      </div>
                      <div>
                        <p className="mb-1 font-black text-destiny-grey">{item.title}</p>
                        <p className="text-sm leading-relaxed text-destiny-grey/60">{item.body}</p>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Plan a Visit.jpg" alt="Destiny Church" width={640} height={300} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/WorshipMoment1.jpg" alt="Worship" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Community.webp" alt="Community" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* What to expect video */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">See For Yourself</p>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">What to expect</h2>
            <p className="mb-10 text-center text-sm text-destiny-grey/50">Get a feel for what Sunday looks like at Destiny</p>
          </AnimateIn>
          <AnimateIn delay={80}>
            {/* TODO: Replace src with YouTube embed URL when available */}
            <div className="overflow-hidden rounded-3xl bg-[#f5f7fa] aspect-video flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-rounded mb-3 block text-5xl text-destiny-grey/30">play_circle</span>
                <p className="text-sm font-bold text-destiny-grey/40">Video coming soon</p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Kids & Youth */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">Bringing the Family?</p>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">We&apos;ve got the kids covered</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Safe, fun and faith-filled spaces for every age group</p>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            <AnimateIn delay={0}>
              <div className="flex h-full flex-col rounded-3xl bg-[#f5f7fa] p-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#F5802118" }}>
                  <span className="material-symbols-rounded text-2xl text-[#F58021]">child_care</span>
                </div>
                <h3 className="mb-1 font-black text-destiny-grey">Destiny Kids</h3>
                <p className="mb-2 text-xs font-bold text-destiny-orange">Ages 0–11 · From 10:45am</p>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-destiny-grey/60">
                  Age-appropriate classes for babies through to Year 6 — packed with stories, crafts, games and worship. All leaders are DBS-checked and trained.
                </p>
                <Link href="/kids" className="text-sm font-bold text-destiny-orange transition hover:underline">
                  Learn about Destiny Kids →
                </Link>
              </div>
            </AnimateIn>
            <AnimateIn delay={80}>
              <div className="flex h-full flex-col rounded-3xl bg-[#f5f7fa] p-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#8106B118" }}>
                  <span className="material-symbols-rounded text-2xl text-[#8106B1]">bolt</span>
                </div>
                <h3 className="mb-1 font-black text-destiny-grey">Destiny Youth</h3>
                <p className="mb-2 text-xs font-bold text-destiny-orange">Ages 11–18 · Wednesday 7pm</p>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-destiny-grey/60">
                  A dedicated midweek gathering for young people aged 11–18. KS3, KS4 and KS5 groups — energetic, welcoming and rooted in faith.
                </p>
                <Link href="/youth" className="text-sm font-bold text-destiny-orange transition hover:underline">
                  Learn about Destiny Youth →
                </Link>
              </div>
            </AnimateIn>
            <AnimateIn delay={160}>
              <div className="flex h-full flex-col rounded-3xl bg-[#f5f7fa] p-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#02800218" }}>
                  <span className="material-symbols-rounded text-2xl text-[#028002]">group</span>
                </div>
                <h3 className="mb-1 font-black text-destiny-grey">Young Adults</h3>
                <p className="mb-2 text-xs font-bold text-destiny-orange">Ages 18–30+</p>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-destiny-grey/60">
                  A community for those in their 18s–30s. Events, meals, Connect Groups and doing life together throughout the year.
                </p>
                <Link href="/young-adults" className="text-sm font-bold text-destiny-orange transition hover:underline">
                  Learn about Young Adults →
                </Link>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Map + address */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Getting Here</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">Find us</h2>
              <div className="mb-6 space-y-4 text-sm text-destiny-grey/70">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-rounded mt-0.5 shrink-0 text-xl text-destiny-orange">location_on</span>
                  <div>
                    <p className="font-bold text-destiny-grey">Destiny Centre</p>
                    <p>Norton Road, Stockton-on-Tees, TS20 2QQ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-rounded mt-0.5 shrink-0 text-xl text-destiny-orange">local_parking</span>
                  <div>
                    <p className="font-bold text-destiny-grey">Parking</p>
                    <p>Free on-site parking is available. Our Welcome Team will be glad to help when you arrive.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-rounded mt-0.5 shrink-0 text-xl text-destiny-orange">directions_bus</span>
                  <div>
                    <p className="font-bold text-destiny-grey">By Bus</p>
                    <p className="mb-1.5">Several bus routes stop nearby on Norton Road.</p>
                    <a
                      href="https://moovitapp.com/index/en-gb/public_transportation-Destiny_Centre-North_East-site_163915994-2104"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-destiny-orange transition hover:underline"
                    >
                      Plan your journey
                      <span className="material-symbols-rounded text-sm">open_in_new</span>
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-rounded mt-0.5 shrink-0 text-xl text-destiny-orange">accessible</span>
                  <div>
                    <p className="font-bold text-destiny-grey">Accessibility</p>
                    <p>Step-free access, accessible toilets and BSL interpretation available. Contact us in advance for specific requirements.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-rounded mt-0.5 shrink-0 text-xl text-destiny-orange">call</span>
                  <div>
                    <p className="font-bold text-destiny-grey">Phone</p>
                    <a href="tel:+441642559797" className="transition hover:text-destiny-orange">01642 559797</a>
                  </div>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full overflow-hidden rounded-3xl md:w-1/2">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2316.5!2d-1.3197!3d54.5778!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487eef47c6b29b4d%3A0x1a2b3c4d5e6f7a8b!2sDestiny%20Centre%2C%20Norton%20Rd%2C%20Stockton-on-Tees%20TS20%202QQ!5e0!3m2!1sen!2suk!4v1234567890"
                width="100%"
                height="380"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Destiny Centre map"
                className="rounded-3xl"
              />
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">Common Questions</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Anything else — just ask us</p>
          </AnimateIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <AnimateIn key={i} delay={i * 50}>
                <div className="rounded-2xl bg-[#f5f7fa] p-6">
                  <p className="mb-2 font-black text-destiny-grey">{faq.q}</p>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{faq.a}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width slideshow */}
      <VisitSlideshow />
    </>
  );
}
