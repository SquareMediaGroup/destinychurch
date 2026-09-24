"use client";

import { useState } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import CourseEventCard from "@/components/courses/CourseEventCard";
import { useCourseEvents, summarizeCourseSession } from "@/lib/useCourseEvents";
import { COURSE_ADMIN_PAGES } from "@/lib/courseEvents";

const ACCENT = COURSE_ADMIN_PAGES["bible-course"].accent;
const ACCENT_DARK = "#0f2e42";
const ACCENT_TINT = "#eaf1f5";
const PROMO_VIDEO = "/img/BibleCourse/promo.mp4";

const features = [
  {
    icon: "auto_stories",
    title: "The big picture",
    body: "See how the whole Bible fits together as one unfolding story — from creation to new creation — rather than a collection of disconnected passages.",
  },
  {
    icon: "timeline",
    title: "A clear timeline",
    body: "Follow a simple, memorable timeline that maps the key people, events and turning points, so you always know where you are in the story.",
  },
  {
    icon: "play_circle",
    title: "Engaging video teaching",
    body: "Each session is built around short, accessible films from Bible Society that bring the text and its background to life.",
  },
  {
    icon: "groups",
    title: "Great conversation",
    body: "Designed for small groups, with plenty of space to ask questions, share honestly and discover together — whatever your starting point.",
  },
];

const sessions = [
  { n: "01", title: "Introduction", body: "Why the Bible matters and how the whole story hangs together." },
  { n: "02", title: "Creation & the Fall", body: "The beginning of everything, and where things went wrong." },
  { n: "03", title: "The Patriarchs", body: "God's promises to Abraham and the birth of a people." },
  { n: "04", title: "Exodus & the Law", body: "Rescue from Egypt and life shaped by God's covenant." },
  { n: "05", title: "The Promised Land & Kings", body: "A nation, its leaders, and the longing for a true king." },
  { n: "06", title: "Exile & Prophets", body: "Loss, hope, and the promise of restoration." },
  { n: "07", title: "Jesus & the Gospels", body: "The moment the whole story has been pointing towards." },
  { n: "08", title: "The Church & Revelation", body: "Good news for the world, and how the story ends." },
];

export default function BibleCoursePage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const { events, loading } = useCourseEvents((e) => e.type === "bible_course");

  const primaryEvent = events[0] ?? null;
  const { subtitle: signupSubtitle } = summarizeCourseSession(primaryEvent);

  const openSignup = () => setSignupOpen(true);
  const closeSignup = () => setSignupOpen(false);

  const openVideo = () => {
    setVideoOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeVideo = () => {
    setVideoOpen(false);
    document.body.style.overflow = "";
  };

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <Image
            src="/img/BibleCourse/presenters.webp"
            alt="The Bible Course presenters"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,46,66,0.82) 0%, rgba(27,73,101,0.6) 50%, rgba(0,0,0,0.6) 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center justify-center py-[11rem] px-6 md:px-12 text-center">
            <AnimateIn>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-on-dark-muted">
                By Bible Society
              </p>
              <h1 className="mb-8 max-w-3xl text-5xl font-black leading-[0.95] text-white md:text-6xl lg:text-7xl">
                The Bible Course
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
                An award-winning eight-session journey through the world&apos;s
                best-selling book — discover how the whole story of the Bible fits
                together, and why it still speaks today.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {!loading && primaryEvent ? (
                  <button
                    onClick={openSignup}
                    className="inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                    style={{
                      backgroundColor: ACCENT,
                      boxShadow: "0 12px 30px -10px rgba(27,73,101,0.7)",
                    }}
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">
                      person_add
                    </span>
                    Register your interest
                  </button>
                ) : null}
                <button
                  onClick={openVideo}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <span className="material-symbols-rounded text-base" aria-hidden="true">
                    play_circle
                  </span>
                  Watch trailer
                </button>
              </div>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Event card(s) */}
      {events.length > 0 && (
        <div className={`mx-auto max-w-5xl px-4 pb-14 lg:px-8 ${events.length > 1 ? "space-y-6" : ""}`}>
          {events.map((event) => (
            <CourseEventCard key={event.id} event={event} accentColor={ACCENT} />
          ))}
        </div>
      )}

      {/* About */}
      <section id="about" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src="/img/BibleCourse/promo-aw5.jpg"
                  alt="The Bible Course"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </AnimateIn>
            <AnimateIn className="w-full md:w-1/2">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: ACCENT }}
              >
                What is The Bible Course?
              </p>
              <h2 className="mb-6 text-3xl font-black text-destiny-grey md:text-4xl">
                The whole story, in eight sessions
              </h2>
              <div className="space-y-4 text-base leading-relaxed text-muted md:text-lg">
                <p>
                  The Bible Course is a brilliant way to explore the world&apos;s
                  best-selling book. Over eight sessions it offers a big-picture
                  overview of the Bible, showing how its great story of creation,
                  rescue and hope fits together from beginning to end.
                </p>
                <p>
                  Combining video teaching, a course guide and a unique Bible
                  timeline, it helps the story stick — connecting key events,
                  people and themes so the Bible starts to make sense as a whole.
                </p>
                <p>
                  Whether you&apos;re reading the Bible for the first time or have
                  known it for years, there&apos;s space to ask questions, share
                  honestly and grow together in a friendly small group.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="relative h-10 w-32 shrink-0">
                  <Image
                    src="/img/BibleCourse/logo-bible-society.webp"
                    alt="Bible Society"
                    fill
                    className="object-contain object-left"
                    sizes="128px"
                  />
                </div>
                <p className="text-xs text-subtle">
                  Created and produced by Bible Society.
                </p>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* What you'll explore */}
      <section className="py-16" style={{ backgroundColor: ACCENT_TINT }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              What you&apos;ll explore
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-base text-muted">
              Eight sessions that walk through the sweep of the Bible&apos;s story.
            </p>
          </AnimateIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sessions.map((s, i) => (
              <AnimateIn key={s.n} delay={(i % 4) * 80}>
                <div className="flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm">
                  <span
                    className="mb-3 text-sm font-black italic"
                    style={{
                      color: ACCENT,
                      fontFamily: "var(--font-playfair), Georgia, serif",
                    }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mb-2 text-lg font-black text-destiny-grey">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why you'll love it */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Why you&apos;ll love it
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <AnimateIn key={f.title} delay={i * 80}>
                <div className="flex h-full flex-col items-start rounded-3xl bg-[#f5f7fa] p-8 shadow-sm">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "rgba(27,73,101,0.1)" }}
                  >
                    <span
                      className="material-symbols-rounded text-3xl"
                      style={{ color: ACCENT }}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-destiny-grey">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-up CTA */}
      <section className="py-20" style={{ backgroundColor: ACCENT_TINT }}>
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Come and see for yourself
            </h2>
            <p className="mb-8 text-base leading-relaxed text-muted">
              No experience needed and no pressure — just bring your questions.
              Register your interest and we&apos;ll be in touch with the next
              start date.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {!loading && primaryEvent ? (
                <button
                  onClick={openSignup}
                  className="rounded-full px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: "0 12px 30px -10px rgba(27,73,101,0.5)",
                  }}
                >
                  Register your interest
                </button>
              ) : (
                <div className="text-sm text-subtle">
                  {loading
                    ? "Loading course details…"
                    : "No upcoming sessions scheduled yet — check back soon."}
                </div>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />

      {primaryEvent && (
        <ChurchSuiteModal
          open={signupOpen}
          onClose={closeSignup}
          src={primaryEvent.signup_url}
          title="Register for The Bible Course"
          subtitle={signupSubtitle}
        />
      )}

      {/* Trailer lightbox */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={closeVideo}
        >
          <button
            onClick={closeVideo}
            aria-label="Close video"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">close</span>
          </button>
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={PROMO_VIDEO}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
