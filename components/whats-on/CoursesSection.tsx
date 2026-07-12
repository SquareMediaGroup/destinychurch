import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import {
  COURSES,
  COURSE_ORDER,
  type CourseDef,
  type CourseId,
} from "@/lib/courses";

export default function CoursesSection({
  featuredId = "bible_course",
}: {
  featuredId?: CourseId;
}) {
  const featured = COURSES[featuredId] ?? COURSES.bible_course;
  const gridIds = COURSE_ORDER.filter((id) => id !== featured.id);

  return (
    <section id="courses" className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-3xl font-black text-destiny-grey md:text-4xl">
            Courses
          </h2>
        </AnimateIn>

        {/* Featured course — full width, above the course grid */}
        <AnimateIn>
          <FeaturedBlock course={featured} />
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gridIds.map((id, i) => (
            <AnimateIn key={id} delay={i * 100}>
              <CourseCardView course={COURSES[id]} />
            </AnimateIn>
          ))}
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

function FeaturedBlock({ course }: { course: CourseDef }) {
  const f = course.featured;
  return (
    <div className="mb-6 overflow-hidden rounded-2xl shadow-md">
      <div
        className="relative flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center"
        style={{ minHeight: "380px" }}
      >
        {/* Background photo */}
        <Image
          src={f.image}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          aria-hidden="true"
        />
        {/* Brand colour wash */}
        <div className="absolute inset-0" style={{ background: f.gradient }} />
        {/* Content */}
        <div className="relative max-w-lg">
          {f.eyebrow && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-white/70">
              {f.eyebrow}
            </p>
          )}
          <h3 className="mb-4 text-4xl font-black text-white md:text-6xl">
            {f.titleLines.map((line, i) => (
              <span key={line}>
                {line}
                {i < f.titleLines.length - 1 && <br />}
              </span>
            ))}
          </h3>
          <p className="text-base leading-relaxed text-white/70">
            {f.description}
          </p>
        </div>
        <div className="relative flex shrink-0 flex-col gap-3">
          <Link
            href={f.primary.href}
            className="rounded-full px-8 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            style={{ backgroundColor: f.primary.color }}
          >
            {f.primary.label}
          </Link>
          {f.secondary && (
            <Link
              href={f.secondary.href}
              className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
            >
              {f.secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseCardView({ course }: { course: CourseDef }) {
  const c = course.card;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="relative h-100 w-full overflow-hidden bg-white">
        <Image
          src={c.image}
          alt={course.name}
          fill
          className={c.imageClass ?? "object-cover"}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {c.overlay && (
          <>
            <div
              className="absolute inset-0"
              style={{ background: c.overlay.gradient }}
            />
            <div className="absolute inset-x-0 bottom-4 px-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                {c.overlay.eyebrow}
              </p>
              <h3 className="text-2xl font-black text-white">
                {c.overlay.heading}
              </h3>
            </div>
          </>
        )}
      </div>
      <div className="p-6">
        <h3
          className="mb-1 text-lg font-black"
          style={{ color: c.titleColor }}
        >
          {c.title}
        </h3>
        {c.subtitle && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-destiny-grey/40">
            {c.subtitle}
          </p>
        )}
        <p className="mb-5 text-sm leading-relaxed text-destiny-grey/70">
          {c.description}
        </p>
        <Link
          href={c.cta.href}
          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          style={{ backgroundColor: c.cta.color }}
        >
          {c.cta.label}
        </Link>
      </div>
    </div>
  );
}
