import type { Metadata } from "next";
import AnimateIn from "@/components/AnimateIn";
import ContactForm from "./ContactForm";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Destiny Church Tees Valley. Call us on 01642 559797, email us, or send a message using our contact form. We'd love to hear from you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Destiny Church Tees Valley",
    description: "Get in touch — call 01642 559797 or send us a message. We'd love to hear from you.",
    url: "https://destinytees.uk/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl py-[10rem] px-4 text-center"
          style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
        >
          <AnimateIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Get in Touch</p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">Contact Us</h1>
            <p className="mx-auto max-w-xl text-base text-white/60 md:text-lg">
              We&apos;d love to hear from you. Send us a message and we&apos;ll get back to you as soon as possible.
            </p>
          </AnimateIn>
        </section>
      </div>

      <section className="bg-white py-20" id="first-impressions">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-16 md:grid-cols-2">

            {/* Contact details */}
            <AnimateIn>
              <h2 className="mb-8 text-2xl font-black text-destiny-grey">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">location_on</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Address</p>
                    <p className="text-sm leading-relaxed text-destiny-grey/60">
                      Destiny Centre<br />
                      Norton Road<br />
                      Stockton-on-Tees<br />
                      TS20 2QQ
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">mail</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Email</p>
                    <a href="mailto:admin@destinytees.uk" className="text-sm text-destiny-orange hover:underline">
                      admin@destinytees.uk
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">phone</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Phone</p>
                    <a href="tel:+441642559797" className="text-sm text-destiny-orange hover:underline">
                      01642 559 797
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">schedule</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Sunday Service</p>
                    <p className="text-sm text-destiny-grey/60">11:00am every Sunday</p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Form */}
            <AnimateIn delay={100}>
              <h2 className="mb-8 text-2xl font-black text-destiny-grey">Send a Message</h2>
              <Link
                href="/connect-card"
                className="mb-6 flex items-center gap-3 rounded-2xl border border-destiny-orange/20 bg-destiny-orange/5 px-4 py-3 transition hover:bg-destiny-orange/10"
              >
                <span className="material-symbols-rounded text-xl text-destiny-orange">waving_hand</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-destiny-grey">New here?</p>
                  <p className="text-xs text-destiny-grey/60">Fill in a connect card instead — it&apos;s the best way to say hello.</p>
                </div>
                <span className="material-symbols-rounded text-sm text-destiny-orange">arrow_forward</span>
              </Link>
              <ContactForm />
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* First Impressions feedback form */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Feedback
            </p>
            <h2 className="mb-4 text-4xl font-black text-destiny-grey md:text-5xl">
              First Impressions
            </h2>
            <p className="text-base leading-relaxed text-destiny-grey/60">
              Visited us recently? We&apos;d love to know what you thought — your feedback helps us make every visit better.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/-/forms/fhq8ahuc"
              title="First Impressions feedback form"
              minHeight={700}
              className="rounded-2xl border border-black/5 bg-white shadow-sm"
            />
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
