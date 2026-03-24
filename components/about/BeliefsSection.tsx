import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function BeliefsSection() {
  return (
    <section className="bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Header card */}
        <AnimateIn>
          <div className="mb-10 rounded-2xl bg-[#f5f7fa] p-5 sm:p-8">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black text-destiny-grey sm:text-3xl md:text-4xl">Our Beliefs</h2>
              <Link
                href="/beliefs"
                className="w-fit rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              >
                Our Beliefs
              </Link>
            </div>
            <p className="text-sm text-destiny-grey/50">
              Learn more about what we as a church believe
            </p>
          </div>
        </AnimateIn>

        {/* Foundational Pillars */}
        <AnimateIn delay={100}>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Our Foundational Pillars
          </p>
          <p className="mb-10 max-w-3xl text-sm leading-relaxed text-destiny-grey/70">
            The Five Pillars of Destiny Church are clearly seen in two fundamental scriptures
            that are intrinsic to its mission, vision and culture. The two Scriptures are known
            historically as the Great Commandment and the Great Commission and are the
            pillars upon which we partner with Jesus in building Destiny Church. From these
            purposes flow all the ministries and activities of Destiny Church.
          </p>
        </AnimateIn>

        {/* Two pillars */}
        <div className="grid gap-6 md:grid-cols-2">
          <AnimateIn delay={150}>
            <div className="rounded-2xl p-5 sm:p-8" style={{ background: "#F58021" }}>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
                The Great Commandment
              </p>
              <p className="mb-6 text-sm leading-relaxed text-white/80">
                &lsquo;Love the Lord your God with all your passion and prayer and intelligence.&rsquo; This is the most important, the first on any list. But there is a second to set alongside it: &lsquo;Love others as well as you love yourself.&rsquo; These two commands are pegs; everything in God&apos;s Law and the Prophets hangs from them.
              </p>
              <p className="text-xs font-bold text-white">— Matthew 22:37–40</p>
            </div>
          </AnimateIn>

          <AnimateIn delay={200}>
            <div className="rounded-2xl p-5 sm:p-8" style={{ background: "#363f48" }}>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
                The Great Commission
              </p>
              <p className="mb-6 text-sm leading-relaxed text-white/80">
                Go out and train everyone you meet, far and near, in this way of life, marking them by baptism in the threefold name: Father, Son, and Holy Spirit. Then instruct them in the practice of all I have commanded you. I&apos;ll be with you as you do this, day after day right up to the end of the age.
              </p>
              <p className="text-xs font-bold text-destiny-orange">— Matthew 28:19–20</p>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
