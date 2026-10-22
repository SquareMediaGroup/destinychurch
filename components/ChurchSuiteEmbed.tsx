"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EmbedLoadingOverlay from "@/components/ui/EmbedLoadingOverlay";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useHydrated } from "@/lib/useHydrated";
import Button from "@/components/ui/Button";
import { EMAIL, PHONE } from "@/lib/churchInfo";
import { STATUS_PAGE_URL } from "@/lib/outage";

/** How long the reachability probe waits before calling the form host down. */
const PROBE_TIMEOUT_MS = 10_000;

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
  const loadedRef = useRef(false);
  const mounted = useHydrated();
  const { consent, allowAll, savePreferences } = useCookieConsent();

  const sizeStyle = fill
    ? { height: "100%" }
    : height
      ? { height }
      : { minHeight: minHeight ?? 500 };

  const canEmbed = mounted && consent?.media === true;

  // A cross-origin iframe can't report failure: when the host is down, the
  // browser loads its own error page into the frame, `onLoad` fires, and the
  // visitor gets a broken-page graphic where the form should be. So probe the
  // host separately. A no-cors request resolves (opaquely) whenever the host
  // answers at all, and rejects only when it can't be reached.
  const [unreachable, setUnreachable] = useState(false);
  useEffect(() => {
    if (!canEmbed) return;
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PROBE_TIMEOUT_MS);
    fetch(`${new URL(src).origin}/favicon.ico`, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .catch(() => {
        if (cancelled) return;
        // A timeout only counts if the form hasn't shown up in that time
        // either; a slow probe beside a working form is no reason to hide it.
        if (!timedOut || !loadedRef.current) setUnreachable(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [canEmbed, src]);

  if (!mounted || !canEmbed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#f5f7fa] px-6 text-center ${className ?? ""}`}
        style={sizeStyle}
      >
        <span className="material-symbols-rounded text-4xl text-destiny-grey/30" aria-hidden="true">cookie</span>
        <div>
          <p className="text-base font-black text-destiny-grey">Cookies required to load this form</p>
          <p className="mt-1 max-w-xs text-sm text-subtle">
            This form is provided by ChurchSuite. Accept cookies to load it here.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={allowAll} size="sm">
            Accept all cookies
          </Button>
          <button
            onClick={() => savePreferences({ media: true, analytics: false })}
            className="rounded-full border border-destiny-grey/20 px-5 py-2.5 text-sm font-medium text-muted transition hover:border-destiny-grey/40 hover:text-destiny-grey"
          >
            Necessary + forms only, no tracking
          </button>
        </div>
        <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-subtle">
          By accepting, you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
        </p>
      </div>
    );
  }

  if (unreachable) {
    return (
      <div
        role="status"
        className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-[#f5f7fa] px-6 text-center ${className ?? ""}`}
        style={sizeStyle}
      >
        <span className="material-symbols-rounded text-4xl text-destiny-orange/70" aria-hidden="true">cloud_off</span>
        <p className="text-base font-black text-destiny-grey">This form isn&apos;t loading right now</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Please try again in a little while. If it&apos;s urgent, call us on{" "}
          <a href={PHONE.href} className="font-semibold text-destiny-grey underline">{PHONE.display}</a>{" "}
          or email{" "}
          <a href={`mailto:${EMAIL}`} className="font-semibold text-destiny-grey underline">{EMAIL}</a>.
        </p>
        <a
          href={STATUS_PAGE_URL}
          className="mt-1 text-sm font-bold text-destiny-orange underline underline-offset-4 hover:no-underline"
        >
          Check service status
        </a>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={sizeStyle}>
      <EmbedLoadingOverlay
        loaded={loaded}
        // A form is what the visitor came for, so a slow one gets a way
        // through: ChurchSuite serves these URLs as full pages too.
        fallbackHref={src}
        fallbackLabel="Open the form in a new tab"
      />
      <iframe
        src={src}
        className="w-full"
        style={{ ...sizeStyle, border: "none", display: "block" }}
        title={title}
        onLoad={() => {
          loadedRef.current = true;
          setLoaded(true);
        }}
      />
    </div>
  );
}
