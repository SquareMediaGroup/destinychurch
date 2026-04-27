"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

const ALPHA_HERO_VIDEO =
  "https://player.vimeo.com/progressive_redirect/playback/1158973369/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&signature=62a42712f74bca4e0082af9c72980c99f54ccf6cebabdfa6ca58dfeae7e7caee";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import AlphaSignupModal from "@/components/AlphaSignupModal";
import AlphaTopics from "@/components/alpha/AlphaTopics";
import AlphaAskAnything from "@/components/alpha/AlphaAskAnything";

interface AlphaEvent {
  id: string;
  start_date: string;
  signup_url: string;
  location: string | null;
}

const steps = [
  {
    icon: "restaurant",
    title: "Food",
    body: "Every session starts with a meal or snacks. Food brings people together and creates a relaxed, social atmosphere before the talk.",
  },
  {
    icon: "play_circle",
    title: "Talk",
    body: "A short talk or video covers a different question about the Christian faith — engaging, honest and never preachy.",
  },
  {
    icon: "forum",
    title: "Discussion",
    body: "The best part. In small groups, everyone gets to share their thoughts. No pressure, no wrong answers — just good conversation.",
  },
];

export default function AlphaPage() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [event, setEvent] = useState<AlphaEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch("/api/alpha-events");
        const data = await res.json();
        const activeAlpha = Array.isArray(data)
          ? data.find((e: AlphaEvent & { type: string; active: boolean }) => e.type === "alpha" && e.active)
          : null;
        setEvent(activeAlpha || null);
      } catch (error) {
        console.error("Failed to fetch Alpha event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, []);

  const openVideo = () => {
    setVideoOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVideoVisible(true)));
    document.body.style.overflow = "hidden";
  };

  const closeVideo = () => {
    setVideoVisible(false);
    setTimeout(() => {
      setVideoOpen(false);
      document.body.style.overflow = "";
    }, 350);
  };

  const openSignup = () => {
    setSignupOpen(true);
  };

  const closeSignup = () => {
    setSignupOpen(false);
  };

  const startDateFormatted = event
    ? new Date(event.start_date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#3a0606]">
          {/* Background video */}
          <video
            src={ALPHA_HERO_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Black overlay 40% */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            aria-hidden="true"
          />
          {/* Subtle bottom shading for CTA legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" aria-hidden="true" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <h1 className="mb-8 text-6xl font-black leading-[0.95] text-white md:text-7xl lg:text-8xl">
                Alpha is for{" "}
                <em className="font-[var(--font-playfair)] italic font-normal tracking-tight" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
                  Everyone
                </em>
              </h1>
              <p className="mb-4 text-lg text-white/80 md:text-xl">
                An open invitation to explore the big questions of life and faith.
              </p>
              {event && startDateFormatted && (
                <p className="mb-6 text-sm font-bold text-destiny-orange">
                  Starting {startDateFormatted}
                  {event.location && ` · ${event.location}`}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row items-center justify-center">
                {!loading && event ? (
                  <>
                    <button
                      onClick={openSignup}
                      className="mt-4 inline-flex items-center gap-3 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
                    >
                      <span className="material-symbols-rounded text-lg">person_add</span>
                      Sign Up Now
                    </button>
                    <button
                      onClick={openVideo}
                      className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      <span className="flex h-5 w-5 items-center justify-center">
                        <svg className="ml-0.5 h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                      Watch promo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={openVideo}
                    className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    <span className="flex h-5 w-5 items-center justify-center">
                      <svg className="ml-0.5 h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    Watch the promo
                  </button>
                )}
              </div>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* What is Alpha */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-20">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                What is Alpha?
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                A space to ask any question
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Alpha is a series of sessions exploring the Christian faith. Run over several weeks,
                each session looks at a different question around faith and is designed to create
                conversation. It&apos;s for anyone — whether you&apos;re curious, sceptical, or
                just exploring.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                It&apos;s completely free, there&apos;s no pressure and no commitment. Come as you are,
                bring your questions and see what you think.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-1/2">
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="/img/Alpha/Alpha/WiA-SC_V2-Carousel_01.jpg"
                  alt="Alpha session"
                  width={640}
                  height={420}
                  className="w-full object-cover"
                />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              How Does It Work?
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <AnimateIn key={step.title} delay={i * 80}>
                <div className="flex flex-col items-start rounded-3xl bg-white p-8 shadow-sm">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-3xl text-destiny-orange">{step.icon}</span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-destiny-grey">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{step.body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Topics */}
      <AlphaTopics />

      {/* Ask Anything */}
      <AlphaAskAnything />

      {/* Youth Alpha */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <AnimateIn className="grid w-full grid-cols-2 gap-3 md:w-2/5">
              {["5", "6"].map((n) => (
                <div key={n} className="overflow-hidden rounded-2xl">
                  <Image
                    src={`/img/Alpha/YouthAlpha/${n}.png`}
                    alt="Youth Alpha"
                    width={200}
                    height={250}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-3/5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                For Young People
              </p>
              <h2 className="mb-5 text-3xl font-black text-white md:text-4xl">
                Youth Alpha
              </h2>
              <p className="mb-6 text-base leading-relaxed text-white/70">
                Youth Alpha is the same great course, redesigned specifically for young people.
                Same big questions, same open conversations — just in a format that connects
                with a younger generation.
              </p>
              <Link
                href="/youth"
                className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                Find out more
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Sign up CTA */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Ready to give it a try?
            </h2>
            <p className="mb-8 text-base leading-relaxed text-destiny-grey/60">
              Alpha is free, relaxed and open to everyone. Register your interest below
              and we&apos;ll be in touch with the next start date.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {!loading && event ? (
                <>
                  <button
                    onClick={openSignup}
                    className="rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                  >
                    Register for Alpha
                  </button>
                  <button
                    onClick={openVideo}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-destiny-grey/20 px-8 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Watch promo
                  </button>
                </>
              ) : (
                <div className="text-sm text-destiny-grey/50">
                  {loading ? "Loading event details..." : "No upcoming events scheduled yet"}
                </div>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />

      {/* Video modal */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: videoVisible ? "rgba(0,0,0,0.93)" : "rgba(0,0,0,0)",
            transition: "background 0.35s ease",
          }}
          onClick={closeVideo}
        >
          <div
            className="relative w-full px-4 md:px-8"
            style={{
              maxWidth: "90vw",
              opacity: videoVisible ? 1 : 0,
              transform: videoVisible ? "scale(1)" : "scale(0.88)",
              transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeVideo}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              aria-label="Close video"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-hidden rounded-3xl bg-black shadow-2xl">
              <video
                src="/img/Alpha/alpha_stay_curious-1080p.mp4"
                controls
                autoPlay
                className="w-full"
                style={{ maxHeight: "80vh" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Signup modal */}
      {event && (
        <AlphaSignupModal
          open={signupOpen}
          onClose={closeSignup}
          signupUrl={event.signup_url}
          title="Register for Alpha"
          subtitle={startDateFormatted ? `Starting ${startDateFormatted}` : undefined}
        />
      )}
    </>
  );
}
