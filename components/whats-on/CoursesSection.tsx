import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function CoursesSection() {
  return (
    <section id="courses" className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-3xl font-black text-destiny-grey md:text-4xl">
            Courses
          </h2>
        </AnimateIn>

        {/* The Bible Course — full width, above the course grid */}
        <AnimateIn>
          <div className="mb-6 overflow-hidden rounded-2xl shadow-md">
            <div
              className="relative flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center"
              style={{ minHeight: "380px" }}
            >
              {/* Background photo */}
              <Image
                src="/img/BibleCourse/presenters.webp"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                aria-hidden="true"
              />
              {/* Brand colour wash */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, rgba(15,46,66,0.9) 0%, rgba(27,73,101,0.7) 45%, rgba(27,73,101,0.25) 100%)",
                }}
              />
              {/* Content */}
              <div className="relative max-w-lg">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                  By Bible Society
                </p>
                <h3 className="mb-4 text-4xl font-black text-white md:text-6xl">
                  The Bible<br />Course
                </h3>
                <p className="text-base leading-relaxed text-white/70">
                  An award-winning eight-session journey through the Bible.
                  Discover how the whole story fits together — no experience
                  needed, everyone welcome.
                </p>
              </div>
              <div className="relative flex shrink-0 flex-col gap-3">
                <Link
                  href="/bible-course"
                  className="rounded-full px-8 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                  style={{ backgroundColor: "#1b4965" }}
                >
                  Find out more
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  Register Interest
                </Link>
              </div>
            </div>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* CAP Money Course */}
          <AnimateIn>
            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="relative h-100 w-full overflow-hidden bg-white">
                <Image
                  src="/img/photos/Courses/Cap.webp"
                  alt="CAP Money Course"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-6">
                <h3 className="mb-1 text-lg font-black text-destiny-orange">CAP Money Course</h3>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-destiny-grey/40">Cap Money</p>
                <p className="mb-5 text-sm leading-relaxed text-destiny-grey/70">
                  The CAP Money Course is a revolutionary money management course that teaches
                  a simple budgeting system that really works.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-destiny-grey px-6 py-2.5 text-sm font-bold text-white transition hover:bg-destiny-grey/80"
                >
                  Register Interest
                </Link>
              </div>
            </div>
          </AnimateIn>

          {/* Alpha */}
          <AnimateIn delay={100}>
            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="relative h-100 w-full overflow-hidden">
                <Image
                  src="/img/photos/Courses/Alpha.webp"
                  alt="Alpha Course"
                  fill
                  className="object-cover object-bottom"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-4 px-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                    There&apos;s more to explore. Try Alpha.
                  </p>
                  <h3 className="text-2xl font-black text-white">Stay Curious</h3>
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-1 text-lg font-black text-destiny-orange">Alpha</h3>
                <p className="mb-5 text-sm leading-relaxed text-destiny-grey/70">
                  Alpha is a series of sessions exploring the Christian faith. Typically run over eleven weeks,
                  each session looks at a different question around faith
                  and is designed to create conversation.
                </p>
                <Link
                  href="/alpha"
                  className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Try Alpha
                </Link>
              </div>
            </div>
          </AnimateIn>

          {/* Destiny Recovery */}
          <AnimateIn delay={200}>
            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="relative h-100 w-full overflow-hidden">
                <Image
                  src="/img/DCRecovery/Hero.webp"
                  alt="Destiny Recovery"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,81,63,0.85) 0%, rgba(0,103,86,0.4) 50%, transparent 100%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-4 px-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                    A 12-step Christ-centred journey.
                  </p>
                  <h3 className="text-2xl font-black text-white">Find Healing</h3>
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-1 text-lg font-black" style={{ color: "#006756" }}>
                  Destiny Recovery
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-destiny-grey/70">
                  Christian recovery support that meets you where you are. A 12-step
                  programme providing a Christ-centred pathway to overcoming
                  struggles and healing from emotional wounds.
                </p>
                <Link
                  href="/destiny-recovery"
                  className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                  style={{ backgroundColor: "#006756" }}
                >
                  Learn More
                </Link>
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* Keep Growing in Faith — full width */}
        <AnimateIn delay={150}>
          <div className="mt-6 overflow-hidden rounded-2xl shadow-md">
            <div className="relative flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center" style={{ minHeight: "380px" }}>
              {/* Background photo */}
              <Image
                src="/img/photos/Training_DC-scaled.webp"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                aria-hidden="true"
              />
              {/* DC gradient overlay — contained and reduced opacity */}
              <div className="absolute inset-0 opacity-65">
                <Image
                  src="/img/brand/DCgradient.webp"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  aria-hidden="true"
                />
              </div>
              {/* Black to transparent overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
              {/* Content */}
              <div className="relative max-w-lg">
                <h3 className="mb-4 text-4xl font-black text-white md:text-6xl">
                  Keep Growing<br />in Faith
                </h3>
                <p className="text-base leading-relaxed text-white/70">
                  Click the button to register your interest in the
                  range of different options available at Destiny Church.
                </p>
              </div>
              <div className="relative flex shrink-0 flex-col gap-3">
                <Link
                  href="/contact"
                  className="rounded-full bg-destiny-orange px-8 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                >
                  Register Interest
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  Contact Pastoral Team
                </Link>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
