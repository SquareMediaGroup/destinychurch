"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "destiny-beta-acknowledged";

export default function BetaDisclaimer() {
  const [mounted, setMounted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        setAcknowledged(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted || acknowledged) {
      document.body.style.overflow = "";
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mounted, acknowledged]);

  if (!mounted || acknowledged) return null;

  const handleContinue = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setAcknowledged(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-8 text-center shadow-2xl">
        <span className="material-symbols-rounded mb-4 inline-block text-5xl text-destiny-orange">
          construction
        </span>

        <h2 className="mb-2 text-xl font-black text-white">Beta Site</h2>

        <p className="mb-6 text-sm leading-relaxed text-white/60">
          This site is currently in beta. Information displayed may be
          inaccurate or incomplete. For the official site, please visit{" "}
          <a
            href="https://destinytees.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-destiny-orange underline underline-offset-2 transition hover:brightness-110"
          >
            destinytees.uk
          </a>
          .
        </p>

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl bg-white/5 p-4 text-left transition hover:bg-white/[0.08]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-destiny-orange"
          />
          <span className="text-sm text-white/70">
            I understand this is a beta site and information may not be accurate.
          </span>
        </label>

        <button
          onClick={handleContinue}
          disabled={!checked}
          className="w-full rounded-full bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
        >
          Continue to Site
        </button>
      </div>
    </div>
  );
}
