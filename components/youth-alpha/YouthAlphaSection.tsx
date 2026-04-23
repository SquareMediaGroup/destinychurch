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
        className="py-16"
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <AnimateIn className="w-full overflow-hidden rounded-3xl md:w-2/5">
              <Image
                src="/img/Alpha/Alpha/IG-MAIN-scaled.jpg"
                alt="Youth Alpha"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-3/5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Explore Faith
              </p>
              <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
                Youth Alpha
              </h2>
              <p className="mb-2 text-base leading-relaxed text-white/70">
                Got questions about life, faith and what it all means? Youth Alpha is a space
                for young people to explore the big questions honestly, without pressure or
                judgement.
              </p>
              {event && startDateFormatted && (
                <p className="mb-6 text-sm font-bold text-destiny-orange">
                  Starting {startDateFormatted}
                  {event.location && ` · ${event.location}`}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
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
