"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import LogoImage from "./LogoImage";
import { useToast } from "./ToastProvider";
import { useSettings } from "@/lib/settings";

const churchLinks = [
  { label: "Homepage", href: "/" },
  { label: "What's on", href: "/whats-on" },
  { label: "About us", href: "/about" },
  { label: "Serve", href: "/serve" },
];

const connectLinks = [
  { label: "New Here?", href: "/new-here" },
  { label: "Join a Team", href: "/serve" },
  { label: "Connect Groups", href: "/connect" },
];

const legalLinks = [
  { label: "Data & GDPR Policy", href: "/legal/gdpr" },
  { label: "Safeguarding Policy", href: "/legal/safeguarding" },
  { label: "Contact Us", href: "/contact" },
];

export default function ChurchFooter() {
  const { settings, updateSetting } = useSettings();
  const toast = useToast();
  const logoClicks = useRef(0);

  const promptDevMode = useCallback(() => {
    const nextMode = !settings.devMode;
    toast.push({
      title: nextMode ? "Enable DevMode?" : "Disable DevMode?",
      message: nextMode
        ? "DevMode shows view IDs and stats for nerds on sermons."
        : "DevMode hides view IDs and stats for nerds on sermons.",
      tone: "info",
      durationMs: 0,
      actions: [
        {
          label: nextMode ? "Yes" : "Turn off",
          variant: "primary",
          onClick: () => {
            updateSetting("devMode", nextMode);
            toast.success(nextMode ? "DevMode enabled." : "DevMode disabled.", "DevMode");
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  }, [settings.devMode, toast, updateSetting]);

  const handleLogoClick = useCallback(() => {
    logoClicks.current += 1;
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      promptDevMode();
    }
  }, [promptDevMode]);

  return (
    <footer className="border-t border-white/10 bg-[#0d1119] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="Destiny Church"
              className="relative h-11 w-[200px] appearance-none border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <LogoImage
                src="/img/brand/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                sizes="200px"
                className="object-contain"
              />
            </button>
            <p className="max-w-md text-sm text-white/70">
              Destiny Church Tees Valley is a multi-cultural church where all
              can find a place to belong and thrive. We&apos;d love to welcome
              you through our doors!
            </p>
            <div className="text-sm text-white/70">
              <p className="font-bold text-white/90">Destiny Centre</p>
              <p>Norton Road</p>
              <p>Stockton-on-Tees</p>
              <p>TS20 2QQ</p>
            </div>
          </div>

          {/* Church column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Church</p>
            <div className="grid gap-2 text-sm">
              {churchLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Connect</p>
            <div className="grid gap-2 text-sm">
              {connectLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Legal</p>
            <div className="grid gap-2 text-sm">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy;{new Date().getFullYear()} Destiny Church Tees Valley &middot;
            Reg Charity No. 1119951
          </span>
          <span>
            Telephone:{" "}
            <a
              href="tel:+441642559797"
              className="underline underline-offset-2 transition hover:text-white"
            >
              01642 559797
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
