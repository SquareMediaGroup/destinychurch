"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import AlphaSignupModal from "@/components/AlphaSignupModal";

interface AlphaEvent {
  id: string;
  start_date: string;
  signup_url: string;
  location: string | null;
}

export default function YouthAlphaSection() {
  const [event, setEvent] = useState<AlphaEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch("/api/alpha-events");
        const data = await res.json();
        const activeYouthAlpha = Array.isArray(data)
          ? data.find(
              (e: AlphaEvent & { type: string; active: boolean }) =>
                e.type === "youth_alpha" && e.active
            )
          : null;
        setEvent(activeYouthAlpha || null);
      } catch (error) {
        console.error("Failed to fetch Youth Alpha event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, []);

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
      <section
        style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
        className="relative overflow-hidden py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, rgba(245,128,33,0.16) 0%, rgba(245,128,33,0) 70%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <AnimateIn className="lg:col-span-5">
              {/* The asset is a 9:16 story graphic, so it's contained rather
                  than cropped — object-cover would slice out a flat band of
                  background and lose the artwork entirely. */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <Image
                    src="/img/Alpha/Alpha/IG-MAIN-scaled.webp"
                    alt="Youth Alpha"
                    fill
                    sizes="(min-width: 1024px) 42vw, 92vw"
                    className="object-contain"
                  />
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="lg:col-span-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Explore Faith
              </p>
              <h2 className="mb-5 text-3xl font-black text-white md:text-4xl">
                Youth Alpha
              </h2>
              <p className="text-base leading-relaxed text-white/70">
                Got questions about life, faith and what it all means? Youth Alpha is a space
                for young people to explore the big questions honestly, without pressure or
                judgement.
              </p>
              {event && startDateFormatted && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-destiny-orange/25 bg-destiny-orange/10 px-4 py-2 text-sm font-bold text-destiny-orange">
                  <span aria-hidden className="material-symbols-rounded text-[18px] leading-none">
                    event
                  </span>
                  Starting {startDateFormatted}
                  {event.location && ` · ${event.location}`}
                </p>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {!loading && event ? (
                  <>
                    <button
                      onClick={openSignup}
                      className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                    >
                      Sign up for Youth Alpha
                    </button>
                    <Link
                      href="/alpha"
                      className="inline-flex items-center rounded-full border-2 border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:border-destiny-orange hover:bg-destiny-orange/5"
                    >
                      About Alpha
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/alpha"
                    className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                  >
                    Find out about Alpha
                  </Link>
                )}
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Signup modal */}
      {event && (
        <AlphaSignupModal
          open={signupOpen}
          onClose={closeSignup}
          signupUrl={event.signup_url}
          title="Sign Up for Youth Alpha"
          subtitle={
            startDateFormatted ? `Starting ${startDateFormatted}` : undefined
          }
        />
      )}
    </>
  );
}
