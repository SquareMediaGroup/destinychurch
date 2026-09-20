import type { Metadata } from "next";
import Link from "next/link";
import AccessibilityPreferences from "./AccessibilityPreferences";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";

/**
 * Accessibility statement and display preferences.
 *
 * This page used to be two toggles and a "Back to Home" link. It was called
 * "Accessibility" and made no accessibility claim at all: no conformance
 * level, no scope, no known issues, no way to report a problem. For a
 * registered charity running a public-facing site that is the part people
 * actually need — the toggles are a nice extra.
 *
 * The known-issues list is deliberately specific and deliberately honest. A
 * statement that claims full conformance is worse than useless, because the
 * one thing a visitor can do with it is find out it is wrong.
 */

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How accessible Destiny Church Tees Valley's website is, what we are working on, and how to tell us about a problem.",
  alternates: { canonical: "/accessibility" },
};

/** Update when the site is next reviewed against WCAG. */
const LAST_REVIEWED = "18 September 2026";

const COMMITMENTS = [
  {
    icon: "keyboard",
    title: "Keyboard access",
    body: "Every menu, form and control can be operated without a mouse, and a 'Skip to main content' link lets you jump past the navigation.",
  },
  {
    icon: "contrast",
    title: "Readable text",
    body: "Body text meets the WCAG AA contrast minimum of 4.5:1, and the site works when you zoom to 200% or increase your browser's text size.",
  },
  {
    icon: "hearing",
    title: "In the building",
    body: "Destiny Centre has step-free access, accessible toilets, and BSL interpretation available. Tell us in advance and we will make sure it is ready.",
  },
];

const KNOWN_ISSUES = [
  "Some older photo galleries and slideshows do not yet announce which slide is showing to a screen reader.",
  "A few embedded services — ChurchSuite forms, YouTube and Google Maps — are provided by third parties, so their accessibility is not fully under our control.",
  "Some archive sermon videos do not have captions. YouTube's automatic captions are available on all of them.",
];

export default function AccessibilityPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-muted pb-20 pt-24 sm:pt-32">
      <Container width="prose">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-destiny-orange"
          >
            <Icon name="arrow_back" size="md" />
            Back to home
          </Link>
        </div>

        <h1 className="mb-4 text-4xl font-black text-destiny-grey sm:text-5xl">
          Accessibility
        </h1>
        <p className="text-lg text-muted">
          We want everyone to be able to use this website and to feel at home in
          our building. This page explains where we have got to, what we know is
          not right yet, and how to tell us when something gets in your way.
        </p>

        <h2 className="mb-6 mt-14 text-2xl font-black text-destiny-grey">
          What we have done
        </h2>
        <div className="space-y-4">
          {COMMITMENTS.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-card border border-hairline bg-white p-5"
            >
              <Icon
                name={item.icon}
                size="xl"
                className="mt-0.5 shrink-0 text-destiny-orange"
              />
              <div>
                <h3 className="font-bold text-destiny-grey">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 mt-14 text-2xl font-black text-destiny-grey">
          How accessible this website is
        </h2>
        <p className="text-muted">
          We aim to meet{" "}
          <a
            href="https://www.w3.org/TR/WCAG22/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-destiny-orange underline underline-offset-2"
          >
            WCAG 2.2 level AA
          </a>
          . We believe most of the site meets that standard, but we know some
          parts do not yet:
        </p>
        <ul className="mt-4 space-y-3">
          {KNOWN_ISSUES.map((issue) => (
            <li key={issue} className="flex gap-3 text-sm text-muted">
              <Icon
                name="radio_button_unchecked"
                size="sm"
                className="mt-1 shrink-0 text-subtle"
              />
              <span className="leading-relaxed">{issue}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-subtle">
          Last reviewed: {LAST_REVIEWED}. We review this when we make
          significant changes to the site.
        </p>

        <h2 className="mb-4 mt-14 text-2xl font-black text-destiny-grey">
          Tell us about a problem
        </h2>
        <p className="text-muted">
          If you find something you cannot use, or you need information from
          this site in a different format, please tell us — we will do what we
          can to put it right and to get you what you need another way.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            Contact us
          </Link>
          <a
            href="tel:01642559797"
            className="inline-flex items-center gap-2 rounded-full border border-divider px-7 py-3 text-sm font-bold text-destiny-grey transition hover:bg-black/[0.03]"
          >
            <Icon name="call" size="sm" />
            01642 559797
          </a>
        </div>

        <h2 className="mb-2 mt-14 text-2xl font-black text-destiny-grey">
          Display preferences
        </h2>
        <p className="mb-6 text-muted">
          These are saved in this browser only, and take effect straight away.
        </p>
        <AccessibilityPreferences />
      </Container>
    </div>
  );
}
