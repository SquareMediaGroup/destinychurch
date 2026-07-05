import type { Metadata } from "next";
import AnimateIn from "@/components/AnimateIn";
import HireForm from "./HireForm";
import FaqAccordion from "./FaqAccordion";
import { getPageContent } from "@/lib/pageContent";

export const metadata: Metadata = {
  title: "Hire Our Venue",
  description: "Hire Destiny Centre in Stockton-on-Tees for your event. We have a main auditorium, meeting rooms and café space available for community, corporate and private hire.",
  alternates: { canonical: "/hire" },
  openGraph: {
    title: "Hire Our Venue | Destiny Church Tees Valley",
    description: "Hire Destiny Centre, Norton Road, Stockton-on-Tees for events, meetings, conferences and more.",
    url: "https://destinytees.uk/hire",
  },
};

const spaces = [
  {
    icon: "stadium",
    name: "Main Auditorium",
    capacity: "Up to 400",
    description: "Our main hall seats up to 400 and features a full PA system, large projection screens, stage lighting and a raised platform. Ideal for conferences, concerts, performances and large events.",
    features: ["Full PA system", "Projection screens", "Stage lighting", "Raised platform", "Accessible seating"],
  },
  {
    icon: "meeting_room",
    name: "Meeting Rooms",
    capacity: "Up to 30 per room",
    description: "Two flexible meeting rooms suitable for small groups, training sessions, interviews or workshops. Both include a projector, whiteboard and air conditioning.",
    features: ["Projector & screen", "Whiteboard", "Air conditioning", "Wi-Fi", "Configurable layout"],
  },
  {
    icon: "local_cafe",
    name: "Café / Foyer Area",
    capacity: "Up to 80",
    description: "Our café and foyer space is perfect for networking events, receptions, exhibitions or informal gatherings. A fully equipped kitchen is available on request.",
    features: ["Kitchen on request", "Café furniture", "Natural light", "Ground floor access", "Ideal for receptions"],
  },
];

const INCLUDED = [
  { icon: "local_parking",      label: "Car Park",                       detail: "Free on-site parking for all your guests" },
  { icon: "wifi",               label: "Wi-Fi 7 Internet",               detail: "Very fast Wi-Fi 7 connection throughout the building" },
  { icon: "directions_bus",     label: "Bus Stop Outside",               detail: "A bus stop is right outside the front door" },
  { icon: "accessible",         label: "Full Step-Free Access",          detail: "Elevators, step-free rooms and accessible toilets for every guest" },
  { icon: "price_check",        label: "No Hidden Fees",                 detail: "The price we quote is the price you pay" },
  { icon: "event_available",    label: "Flexible Cancellation*",         detail: "Plans change — we work with you, not against you" },
  { icon: "cleaning_services",  label: "Spotless Venue",                 detail: "Every space is cleaned and prepared before your event" },
  { icon: "support_agent",      label: "Dedicated On-Site Staff",        detail: "A member of our team is always on hand on the day" },
  { icon: "security",           label: "CCTV",                           detail: "Full CCTV coverage across the building for your peace of mind" },
];

const faqs = [
  {
    q: "What are your hire rates?",
    a: "Rates vary depending on the space, duration and type of event. If you require a member of our Production Team, this is an additional £25 per hour of hire. Submit an enquiry and we'll provide a tailored quote within 2 working days.",
  },
  {
    q: "Is the building accessible?",
    a: "Yes. Destiny Centre has step-free access throughout, accessible toilets, and a hearing loop in the main auditorium.",
  },
  {
    q: "Is parking available?",
    a: "Yes — free on-site parking is available for hirers and their guests.",
  },
  {
    q: "Can we arrange a viewing?",
    a: "Absolutely. Just mention it in your enquiry and we'll arrange a time for you to see the spaces before booking.",
  },
  {
    q: "Are there any restrictions on use?",
    a: "We welcome community, corporate, charitable and private events. We ask that all hire aligns with our values as a church. We reserve the right to decline bookings at our discretion.",
  },
];

export default async function HirePage() {
  const contact = await getPageContent("contact");
  const phone = contact.phone || "01642 559 797";
  const email = contact.email || "admin@destinytees.uk";

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl py-[10rem] px-4 text-center"
          style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('/img/photos/Plan a Visit.webp')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          <AnimateIn className="relative z-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Venue Hire</p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">Hire Our Venue</h1>
            <p className="mx-auto max-w-xl text-base text-white/60 md:text-lg">
              Destiny Centre is available for community, corporate and private hire.
              A flexible, well-equipped space in the heart of Stockton-on-Tees.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#enquiry"
                className="rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
              >
                Make an Enquiry
              </a>
              <a
                href={`tel:+44${phone.replace(/^0/, "").replace(/\s/g, "")}`}
                className="rounded-full border-2 border-white/30 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10"
              >
                Call Us
              </a>
            </div>
          </AnimateIn>
        </section>
      </div>

      {/* Spaces */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Our Spaces</p>
            <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">What&apos;s Available</h2>
          </AnimateIn>
          <div className="grid gap-8 md:grid-cols-3">
            {spaces.map((space, i) => (
              <AnimateIn key={space.name} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col rounded-3xl bg-[#f5f7fa] p-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">{space.icon}</span>
                  </div>
                  <h3 className="mb-1 font-black text-destiny-grey">{space.name}</h3>
                  <p className="mb-3 text-xs font-bold text-destiny-orange">{space.capacity}</p>
                  <p className="mb-5 flex-1 text-sm leading-relaxed text-destiny-grey/60">{space.description}</p>
                  <ul className="space-y-1.5">
                    {space.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-destiny-grey/60">
                        <span className="material-symbols-rounded text-sm text-destiny-orange">check</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Always included */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Every Hire, No Exceptions</p>
            <h2 className="text-3xl font-black text-white md:text-4xl">Always Included</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              No matter what you&apos;re booking or how long for, every hire comes with all of the following — at no extra cost.
            </p>
          </AnimateIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((item, i) => (
              <AnimateIn key={item.label} delay={i * 60} className="h-full">
                <div className="glass glass-sm flex h-full items-start gap-4 rounded-2xl p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/15">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">{item.icon}</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs leading-relaxed text-white/50">{item.detail}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
          <AnimateIn>
            <p className="mt-8 text-center text-xs text-white/30">
              * Flexible Cancellation is subject to our cancellation policy, which will be provided at the time of booking.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Availability notice */}
      <section className="bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <div className="flex flex-col gap-3 rounded-2xl border border-destiny-orange/20 bg-destiny-orange/5 px-6 py-5 sm:flex-row sm:items-center sm:gap-5">
              <span className="material-symbols-rounded shrink-0 text-2xl text-destiny-orange">calendar_month</span>
              <div>
                <p className="text-sm font-black text-destiny-grey">Availability &amp; Time Restrictions</p>
                <p className="mt-0.5 text-sm text-destiny-grey/60">
                  We are <span className="font-bold text-destiny-grey">not available for hire on Sundays</span>.
                  On <span className="font-bold text-destiny-grey">Wednesdays and Thursdays</span>, all hires must end by <span className="font-bold text-destiny-grey">6:00 PM</span>.
                  There are no other date or time restrictions.
                </p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Enquiry form + contact details */}
      <section className="bg-[#f5f7fa] py-20" id="enquiry">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-16 md:grid-cols-[1fr_1.4fr]">

            {/* Left — details */}
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Get in Touch</p>
              <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">Make a Hire Enquiry</h2>
              <p className="mb-8 text-sm leading-relaxed text-destiny-grey/60">
                Fill in the form and we&apos;ll get back to you within 2 working days with availability and a quote.
                Prefer to speak to someone? Call or email us directly.
              </p>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">location_on</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-destiny-grey">Address</p>
                    <p className="text-sm text-destiny-grey/60">
                      Destiny Centre<br />Norton Road<br />Stockton-on-Tees, TS20 2QQ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">phone</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-destiny-grey">Phone</p>
                    <a href={`tel:+44${phone.replace(/^0/, "").replace(/\s/g, "")}`} className="text-sm text-destiny-orange hover:underline">{phone}</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">mail</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-destiny-grey">Email</p>
                    <a href={`mailto:${email}`} className="text-sm text-destiny-orange hover:underline">{email}</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">local_parking</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-destiny-grey">Parking</p>
                    <p className="text-sm text-destiny-grey/60">Free on-site parking for hirers and guests</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">settings_input_hdmi</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-destiny-grey">Production Staff</p>
                    <p className="text-sm text-destiny-grey/60">
                      A member of our Production Team can be provided for your event at an additional <span className="font-bold text-destiny-grey">£25 per hour</span> of hire.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQs */}
              <FaqAccordion faqs={faqs} />
            </AnimateIn>

            {/* Right — form */}
            <AnimateIn delay={100}>
              <div className="rounded-3xl bg-white p-8 shadow-sm">
                <h3 className="mb-6 text-xl font-black text-destiny-grey">Hire Enquiry Form</h3>
                <HireForm />
              </div>
            </AnimateIn>

          </div>
        </div>
      </section>
    </>
  );
}
