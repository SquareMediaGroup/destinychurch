"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import AlphaSignupModal from "@/components/AlphaSignupModal";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import { getNextAlphaSession } from "@/lib/alphaSession";

const ACCENT = "#006756";
const ACCENT_DARK = "#00513f";
const ACCENT_TINT = "#e6f1ee";
const BIBLE_BUY_URL =
  "https://www.amazon.co.uk/s?k=life+recovery+bible+second+edition";

interface RecoveryEvent {
  id: string;
  type: string;
  start_date: string;
  signup_url: string;
  location: string | null;
  format?: "in_person" | "online";
  meeting_platform?: "zoom" | "google_meet" | null;
  meeting_url?: string | null;
  meeting_id?: string | null;
  frequency?: string | null;
  custom_interval_days?: number | null;
  active?: boolean;
}

const features = [
  {
    icon: "menu_book",
    title: "Recovery-focused devotionals",
    body: "Reflections woven through the biblical text that connect Scripture directly to the highs, lows and triumphs of recovery.",
  },
  {
    icon: "stairs",
    title: "Step-by-step biblical application",
    body: "Each of the 12 steps explored through a biblical lens, showing how spiritual truths align with and strengthen the journey.",
  },
  {
    icon: "history_edu",
    title: "Study notes & outlines",
    body: "Deeper context for biblical passages, surfacing themes of healing, identity and freedom most relevant to recovery.",
  },
  {
    icon: "manage_search",
    title: "Topical index & cross-references",
    body: "Easily navigate the Bible to find passages on specific issues, healthy relationships and the road to wholeness.",
  },
];

const pillars = [
  {
    icon: "favorite",
    title: "Christ-centred",
    body: "Jesus is at the heart of every step. Healing flows from a deepening relationship with Him, not willpower alone.",
  },
  {
    icon: "groups",
    title: "Community-powered",
    body: "A safe, supportive space to walk alongside fellow believers — no one navigates life's complexities on their own.",
  },
  {
    icon: "auto_awesome",
    title: "Lasting change",
    body: "Twelve biblical steps that move you from struggle toward freedom, purpose and a renewed life in Christ.",
  },
];

export default function DestinyRecoveryPage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [events, setEvents] = useState<RecoveryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch("/api/alpha-events");
        const data = await res.json();
        const active = Array.isArray(data)
          ? data.filter(
              (e: RecoveryEvent) => e.type === "recovery" && e.active !== false
            )
          : [];
        setEvents(active);
      } catch (err) {
        console.error("Failed to fetch Recovery events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, []);

  const primaryEvent = events[0] ?? null;
  const sessionInfo = primaryEvent
    ? getNextAlphaSession(
        primaryEvent.start_date,
        primaryEvent.frequency,
        primaryEvent.custom_interval_days
      )
    : null;
  const startDateFormatted = sessionInfo
    ? sessionInfo.date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const sessionLeadIn = sessionInfo?.isFirst ? "Starting" : "Next session";

  const openSignup = () => setSignupOpen(true);
  const closeSignup = () => setSignupOpen(false);

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <Image
            src="/img/DCRecovery/Hero.webp"
            alt="Destiny Recovery"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,81,63,0.78) 0%, rgba(0,103,86,0.55) 50%, rgba(0,0,0,0.55) 100%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" aria-hidden="true" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-6 md:px-12 text-center">
            <AnimateIn>
              <div className="mb-5 flex justify-center">
                <Image
                  src="/img/DCRecovery/DC_Recovery_Full_Logo_White.png"
                  alt="Destiny Recovery"
                  width={280}
                  height={80}
                  className="w-full max-w-sm object-contain"
                />
              </div>
              <h1 className="mb-8 max-w-3xl text-5xl font-black leading-[0.95] text-white md:text-6xl lg:text-7xl">
                Christian recovery support that{" "}
                <em
                  className="italic font-normal tracking-tight"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  meets you where you are
                </em>
              </h1>
              <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
                A 12-step programme that provides a Christ-centred pathway to
                overcoming struggles, healing from emotional wounds and pain, and
                strengthening our relationship with our Lord and Saviour Jesus
                Christ.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {!loading && primaryEvent ? (
                  <button
                    onClick={openSignup}
                    className="mt-4 inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                    style={{
                      backgroundColor: ACCENT,
                      boxShadow: "0 12px 30px -10px rgba(0,103,86,0.6)",
                    }}
                  >
                    <span className="material-symbols-rounded text-lg">
                      person_add
                    </span>
                    Sign up now
                  </button>
                ) : null}
                <a
                  href="#about"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Learn more
                  <span className="material-symbols-rounded text-base">
                    arrow_downward
                  </span>
                </a>
              </div>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Event card(s) */}
      {events.length > 0 && (
        <div
          className={`mx-auto max-w-5xl px-4 pb-14 lg:px-8 ${
            events.length > 1 ? "space-y-6" : ""
          }`}
        >
          {events.map((event) => {
            const session = getNextAlphaSession(
              event.start_date,
              event.frequency,
              event.custom_interval_days
            );
            const d = session.date;
            const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
            const day = d.toLocaleDateString("en-GB", { day: "numeric" });
            const month = d.toLocaleDateString("en-GB", { month: "long" });
            const year = d.toLocaleDateString("en-GB", { year: "numeric" });
            const cadenceLabel = session.isFirst ? "Starting" : "Next session";
            const isOnline = event.format === "online";
            const platformLabel =
              event.meeting_platform === "zoom"
                ? "Zoom"
                : event.meeting_platform === "google_meet"
                ? "Google Meet"
                : "Online";

            return (
              <AnimateIn key={event.id}>
                <div
                  className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-black/5"
                  style={{
                    boxShadow: "0 30px 60px -30px rgba(0,103,86,0.35)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f7fa]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f7fa]"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="border-b border-dashed border-destiny-grey/15 px-8 py-7 md:border-b-0 md:border-r md:px-10">
                      <div
                        className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]"
                        style={{ color: ACCENT }}
                      >
                        <span className="material-symbols-rounded text-sm leading-none">
                          event
                        </span>
                        {cadenceLabel}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-destiny-grey/50">
                        {weekday}
                      </div>
                      <div className="mt-1 flex items-baseline gap-3">
                        <span
                          className="text-5xl font-normal italic leading-none text-destiny-grey md:text-6xl"
                          style={{
                            fontFamily: "var(--font-playfair), Georgia, serif",
                          }}
                        >
                          {day}
                        </span>
                        <span className="text-lg font-black uppercase tracking-wide text-destiny-grey md:text-xl">
                          {month}{" "}
                          <span className="text-destiny-grey/40">{year}</span>
                        </span>
                      </div>
                    </div>
                    {isOnline ? (
                      <div className="px-8 py-7 md:px-10">
                        <div
                          className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]"
                          style={{ color: ACCENT }}
                        >
                          <span className="material-symbols-rounded text-sm leading-none">
                            videocam
                          </span>
                          Online
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-destiny-grey/50">
                          Join via
                        </div>
                        <div className="mt-1 text-2xl font-black leading-tight text-destiny-grey md:text-3xl">
                          {platformLabel}
                        </div>
                        {event.meeting_url && (
                          <a
                            href={event.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
                            style={{ backgroundColor: ACCENT }}
                          >
                            <span className="material-symbols-rounded text-[14px] leading-none">
                              open_in_new
                            </span>
                            Join meeting
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="px-8 py-7 md:px-10">
                        <div
                          className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]"
                          style={{ color: ACCENT }}
                        >
                          <span className="material-symbols-rounded text-sm leading-none">
                            place
                          </span>
                          Where
                        </div>
                        {event.location ? (
                          <>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-destiny-grey/50">
                              Join us at
                            </div>
                            <div className="mt-1 text-2xl font-black leading-tight text-destiny-grey md:text-3xl">
                              {event.location}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-destiny-grey/50">
                              Venue
                            </div>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span
                                className="text-5xl font-normal italic leading-none text-destiny-grey/40 md:text-6xl"
                                style={{
                                  fontFamily:
                                    "var(--font-playfair), Georgia, serif",
                                }}
                              >
                                tba
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      )}

      {/* About */}
      <section id="about" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <AnimateIn>
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: ACCENT }}
            >
              What is Destiny Recovery?
            </p>
            <h2 className="mb-6 text-3xl font-black text-destiny-grey md:text-4xl">
              Faith, fellowship and freedom — together
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-destiny-grey/70 md:text-lg">
              <p>
                Destiny Recovery is a Christ-centred 12-step programme that walks
                with you through life&apos;s hardest places — addiction, hurts,
                habits and hang-ups. Every step is rooted in Scripture, pointing
                back to the healing only Jesus can give.
              </p>
              <p>
                This programme thrives on the power of community. We provide a
                safe and supportive space for anyone eager to navigate life&apos;s
                complexities alongside fellow believers — no judgement, no pretence,
                just honest conversation and genuine care.
              </p>
              <p>
                Join our supportive Christian community and experience the power
                of faith and fellowship as you work towards lasting change.
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Pillars */}
      <section
        className="py-16"
        style={{ backgroundColor: ACCENT_TINT }}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              How we walk together
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((p, i) => (
              <AnimateIn key={p.title} delay={i * 80}>
                <div className="flex h-full flex-col items-start rounded-3xl bg-white p-8 shadow-sm">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "rgba(0,103,86,0.1)" }}
                  >
                    <span
                      className="material-symbols-rounded text-3xl"
                      style={{ color: ACCENT }}
                    >
                      {p.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-destiny-grey">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">
                    {p.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Life Recovery Bible */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-2/5">
              <div className="relative mx-auto aspect-[2/3] w-full max-w-xs">
                <Image
                  src="/img/DCRecovery/LifeRecoveryBible.webp"
                  alt="The Life Recovery Bible — Second Edition"
                  fill
                  className="rounded-xl object-cover shadow-2xl"
                  sizes="(min-width: 768px) 320px, 80vw"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-3/5">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: ACCENT }}
              >
                A companion for the journey
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                The Life Recovery Bible
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                The Life Recovery Bible is a unique and powerful resource for
                anyone on the journey to healing and wholeness. Its strength lies
                in weaving biblical truth together with the widely recognised
                12-step recovery model — making it a vital tool for those grappling
                with addictions, hurts and habits.
              </p>
              <p className="mb-6 text-base leading-relaxed text-destiny-grey/70">
                By intertwining the timeless wisdom of Scripture with the practical
                framework of the 12 steps, it offers a comprehensive and
                compassionate guide. It points readers to the truth that spiritual
                principles are foundational to lasting recovery — offering hope,
                direction and a path toward freedom and purpose.
              </p>

              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-3 rounded-2xl border border-black/5 p-4"
                    style={{ backgroundColor: ACCENT_TINT }}
                  >
                    <span
                      className="material-symbols-rounded mt-0.5 text-2xl"
                      style={{ color: ACCENT }}
                    >
                      {f.icon}
                    </span>
                    <div>
                      <p className="mb-1 text-sm font-black text-destiny-grey">
                        {f.title}
                      </p>
                      <p className="text-xs leading-relaxed text-destiny-grey/60">
                        {f.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href={BIBLE_BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                style={{
                  backgroundColor: ACCENT,
                  boxShadow: "0 12px 30px -10px rgba(0,103,86,0.5)",
                }}
              >
                <span className="material-symbols-rounded text-lg">
                  shopping_bag
                </span>
                Buy your own copy
                <span className="material-symbols-rounded text-base">
                  open_in_new
                </span>
              </a>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Sign-up CTA */}
      <section
        className="py-20"
        style={{ backgroundColor: ACCENT_TINT }}
      >
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Take the first step
            </h2>
            <p className="mb-8 text-base leading-relaxed text-destiny-grey/60">
              Whatever you&apos;re carrying, you don&apos;t have to carry it alone.
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
                    boxShadow: "0 12px 30px -10px rgba(0,103,86,0.5)",
                  }}
                >
                  Register for Recovery
                </button>
              ) : (
                <div className="text-sm text-destiny-grey/50">
                  {loading
                    ? "Loading event details…"
                    : "No upcoming sessions scheduled yet — check back soon."}
                </div>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />

      {primaryEvent && (
        <AlphaSignupModal
          open={signupOpen}
          onClose={closeSignup}
          signupUrl={primaryEvent.signup_url}
          title="Register for Destiny Recovery"
          subtitle={
            startDateFormatted
              ? `${sessionLeadIn} ${startDateFormatted}`
              : undefined
          }
        />
      )}
    </>
  );
}
