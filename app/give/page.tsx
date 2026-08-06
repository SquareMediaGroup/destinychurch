import type { Metadata } from "next";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import GiveCTA from "@/components/give/GiveCTA";
import TextToGiveCTA from "@/components/give/TextToGiveCTA";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import { createServiceClient } from "@/utils/supabase/service";

export const revalidate = 60;

async function getGiveContent() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("page_content")
      .select("key, value")
      .eq("page", "give");
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

export const metadata: Metadata = {
  title: "Give",
  description: "Support the work of Destiny Church Tees Valley. Give online, by bank transfer or text. Your generosity helps us serve our community and share the love of God.",
  alternates: { canonical: "/give" },
  openGraph: {
    title: "Give | Destiny Church Tees Valley",
    description: "Support Destiny Church — give online, by bank transfer or text. Every gift makes a difference.",
    url: "https://destinytees.uk/give",
    images: [{ url: "/og/give.webp", width: 1200, height: 630, alt: "Give | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/give.webp"],
  },
};

export default async function GivePage() {
  const content = await getGiveContent();
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
              Generosity
            </p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
              Give
            </h1>
            <p className="mx-auto max-w-xl text-base text-white/60 md:text-lg">
              Thank you for your generosity. Your giving helps us reach our community,
              grow our church family and make a lasting difference.
            </p>
            <div className="mt-8 flex justify-center">
              <GiveCTA />
            </div>
          </AnimateIn>
        </section>
      </div>

      {/* Scripture */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <blockquote className="text-xl font-medium italic leading-relaxed text-destiny-grey md:text-2xl">
              &ldquo;Bring the whole tithe into the storehouse, that there may be food in my house.
              Test me in this,&rdquo; says the Lord Almighty, &ldquo;and see if I will not throw open
              the floodgates of heaven and pour out so much blessing that there will not be room enough
              to store it. I will prevent pests from devouring your crops, and the vines in your fields
              will not drop their fruit before it is ripe,&rdquo; says the Lord Almighty. &ldquo;Then
              all the nations will call you blessed, for yours will be a delightful land,&rdquo;
              says the Lord Almighty.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-bold text-destiny-orange">Malachi 3:10–12</p>
          </AnimateIn>
        </div>
      </section>

      {/* Ways to give */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-2 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Ways to Give
            </h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">
              Choose the method that works best for you
            </p>
          </AnimateIn>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Online */}
            <AnimateIn delay={0}>
              <a href="#give-online" className="group flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm transition hover:shadow-md hover:-translate-y-1 duration-300">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10 transition group-hover:bg-destiny-orange/20">
                  <span className="material-symbols-rounded text-4xl text-destiny-orange">language</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-destiny-grey">Give Online</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  Give securely online using debit or credit card. One-off or recurring giving available.
                </p>
              </a>
            </AnimateIn>

            {/* Standing Order */}
            <AnimateIn delay={80}>
              <a href="#give-bank" className="group flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm transition hover:shadow-md hover:-translate-y-1 duration-300">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10 transition group-hover:bg-destiny-orange/20">
                  <span className="material-symbols-rounded text-4xl text-destiny-orange">account_balance</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-destiny-grey">Standing Order</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  Set up a regular bank transfer directly to Destiny Church from your online banking.
                </p>
              </a>
            </AnimateIn>

            {/* Text */}
            <AnimateIn delay={160}>
              <a href="#give-text" className="group flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm transition hover:shadow-md hover:-translate-y-1 duration-300">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10 transition group-hover:bg-destiny-orange/20">
                  <span className="material-symbols-rounded text-4xl text-destiny-orange">sms</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-destiny-grey">Text to Give</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  Give instantly by text message — no app or account needed.
                </p>
              </a>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Online giving embed */}
      <section id="give-online" className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-rounded text-2xl text-destiny-orange">language</span>
              <h2 className="text-2xl font-black text-destiny-grey">Give Online</h2>
            </div>
            <p className="mb-8 text-sm text-destiny-grey/60">
              Secure online giving powered by ChurchSuite.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/donate"
              title="Give online — Destiny Church"
              height={700}
              className="rounded-3xl border border-black/5 shadow-sm"
            />
          </AnimateIn>
        </div>
      </section>

      {/* Standing order details */}
      <section id="give-bank" className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-rounded text-2xl text-destiny-orange">account_balance</span>
              <h2 className="text-2xl font-black text-destiny-grey">Standing Order / Bank Transfer</h2>
            </div>
            <p className="mb-8 text-sm text-destiny-grey/60">
              Set up a regular or one-off payment directly through your bank using the details below.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Account Name",   value: content.account_name   ?? "Destiny Church Tees Valley" },
                { label: "Sort Code",      value: content.sort_code      ?? "08-92-99" },
                { label: "Account Number", value: content.account_number ?? "67397646" },
                { label: "Reference",      value: "Your full name" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">{label}</p>
                  <p className="text-lg font-black text-destiny-grey">{value}</p>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Text to give */}
      <section id="give-text" className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-rounded text-2xl text-destiny-orange">sms</span>
              <h2 className="text-2xl font-black text-destiny-grey">Text to Give</h2>
            </div>
            <p className="mb-8 text-sm text-destiny-grey/60">
              Send a text message to give instantly — no app or account needed.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <div className="rounded-3xl border border-black/5 bg-[#f5f7fa] p-8 mb-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Step 1</p>
                  <span className="material-symbols-rounded mb-3 block text-4xl text-destiny-grey/40">edit</span>
                  <p className="text-sm font-bold text-destiny-grey">Text the keyword</p>
                  <p className="mt-1 text-2xl font-black text-destiny-orange">{content.text_keyword ?? "DCTEES"}</p>
                </div>
                <div className="text-center">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Step 2</p>
                  <span className="material-symbols-rounded mb-3 block text-4xl text-destiny-grey/40">payments</span>
                  <p className="text-sm font-bold text-destiny-grey">Followed by the amount</p>
                  <p className="mt-1 text-2xl font-black text-destiny-orange">e.g. give 10 <span className="text-base text-destiny-grey/40">or</span> give 10/mo</p>
                </div>
                <div className="text-center">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">Step 3</p>
                  <span className="material-symbols-rounded mb-3 block text-4xl text-destiny-grey/40">send</span>
                  <p className="text-sm font-bold text-destiny-grey">Send to</p>
                  <p className="mt-1 text-2xl font-black text-destiny-orange">{content.text_number ?? "07380 307 800"}</p>
                </div>
              </div>
              <p className="mt-6 text-center text-xs text-destiny-grey/40">
                Add <span className="font-bold">/mo</span> to the end of your amount for a monthly recurring gift.
              </p>
            </div>
          </AnimateIn>

          <AnimateIn delay={200}>
            <TextToGiveCTA
              keyword={content.text_keyword ?? "DCTEES"}
              number={content.text_number ?? "07380 307 800"}
            />
          </AnimateIn>
        </div>
      </section>

      {/* Gift Aid */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-rounded text-2xl text-destiny-orange">volunteer_activism</span>
              <h2 className="text-2xl font-black text-destiny-grey">Gift Aid</h2>
            </div>
            <p className="mb-8 text-sm leading-relaxed text-destiny-grey/60">
              If you&apos;re a UK taxpayer, Gift Aid allows us to reclaim 25p on every £1 you donate
              at no extra cost to you — making your gift go even further.
            </p>
          </AnimateIn>

          <AnimateIn delay={100}>
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <p className="mb-4 font-bold text-destiny-grey">You can Gift Aid your donations by:</p>
              <ul className="mb-6 space-y-3">
                {[
                  "Ticking the Gift Aid box when you give online",
                  "Completing our online Gift Aid Declaration",
                  "Making a declaration in-person at church",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-destiny-grey/70">
                    <span className="material-symbols-rounded shrink-0 text-base text-destiny-orange">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mb-6 text-sm leading-relaxed text-destiny-grey/60">
                Please remember to let us know of any changes to your tax status, including changes
                to your name and address, so we can ensure that no further claims are made against
                your donations.
              </p>
              <Link
                href="https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-3-gift-aid"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              >
                Find out more here
                <span className="material-symbols-rounded text-base">open_in_new</span>
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
