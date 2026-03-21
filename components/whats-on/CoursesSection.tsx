import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function CoursesSection() {
  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-3xl font-black text-destiny-grey md:text-4xl">
            Courses
          </h2>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2">
          {/* CAP Money Course */}
          <AnimateIn>
            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="relative h-100 w-full overflow-hidden bg-white">
                <Image
                  src="/img/photos/Courses/Cap.png"
                  alt="CAP Money Course"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
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
                  src="/img/photos/Courses/Alpha.jpg"
                  alt="Alpha Course"
                  fill
                  className="object-cover object-bottom"
                  sizes="(max-width: 768px) 100vw, 50vw"
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
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Try Alpha
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
                src="/img/photos/Training_DC-scaled.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                aria-hidden="true"
              />
              {/* DC gradient overlay — contained and reduced opacity */}
              <div className="absolute inset-0 opacity-65">
                <Image
                  src="/img/brand/DCgradient.png"
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
