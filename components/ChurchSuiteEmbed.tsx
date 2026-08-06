"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";

interface Props {
  src: string;
  title: string;
  height?: number;
  minHeight?: number;
  /**
   * Fill the parent's height instead of taking a fixed one, so the embedded
   * page scrolls inside itself. Used by the event modal, where the content is
   * arbitrarily long (description + ticket picker + a multi-step form) and a
   * fixed height would mean either dead space or two nested scrollbars.
   */
  fill?: boolean;
  className?: string;
}

export default function ChurchSuiteEmbed({
  src,
  title,
  height,
  minHeight,
  fill,
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { consent, allowAll, savePreferences } = useCookieConsent();

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeStyle = fill
    ? { height: "100%" }
    : height
      ? { height }
      : { minHeight: minHeight ?? 500 };

  const canEmbed = mounted && consent?.media === true;

  if (!mounted || !canEmbed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#f5f7fa] px-6 text-center ${className ?? ""}`}
        style={sizeStyle}
      >
        <span className="material-symbols-rounded text-4xl text-destiny-grey/30">cookie</span>
        <div>
          <p className="text-base font-black text-destiny-grey">Cookies required to load this form</p>
          <p className="mt-1 max-w-xs text-sm text-destiny-grey/50">
            This form is provided by ChurchSuite. Accept cookies to load it here.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={allowAll}
            className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Accept all cookies
          </button>
          <button
            onClick={() => savePreferences({ media: true, analytics: false })}
            className="rounded-full border border-destiny-grey/20 px-5 py-2.5 text-sm font-medium text-destiny-grey/70 transition hover:border-destiny-grey/40 hover:text-destiny-grey"
          >
            Necessary + forms only, no tracking
          </button>
        </div>
        <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-destiny-grey/40">
          By accepting, you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={sizeStyle}>
      <div
        aria-hidden="true"
        className={`churchsuite-loading-overlay${loaded ? " is-loaded" : ""}`}
      >
        <div className="churchsuite-spinner" />
        <p
          style={{
            marginTop: 14,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(54, 63, 72, 0.35)",
          }}
        >
          Loading
        </p>
      </div>
      <iframe
        src={src}
        className="w-full"
        style={{ ...sizeStyle, border: "none", display: "block" }}
        title={title}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
