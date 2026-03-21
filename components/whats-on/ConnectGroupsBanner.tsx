import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function ConnectGroupsBanner() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: "url('/img/photos/ConnectGroups.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-8 py-16 md:flex-row md:items-center lg:px-12">
          <AnimateIn className="max-w-xl">
            <h2 className="mb-3 text-3xl font-black text-white md:text-4xl">
              Join a Connect Group
            </h2>
            <p className="text-base leading-relaxed text-white/70">
              Connect Groups are where godly friends become spiritual family. Where
              faith is stirred, assumptions are challenged, sisters are found, and
              brothers build each other up. Discover who you are, who God is, and how
              to follow Him.
            </p>
          </AnimateIn>

          <AnimateIn delay={150} className="flex shrink-0 flex-col gap-3">
            <Link
              href="/connect"
              className="rounded-full bg-destiny-orange px-8 py-3 text-center text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              Find a Connect Group
            </Link>
            <Link
              href="/contact"
              className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
            >
              Contact Pastoral Team
            </Link>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
