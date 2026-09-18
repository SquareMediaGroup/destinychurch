"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface Props {
  title: string;
  links: FooterLink[];
}

/**
 * Footer link column. On mobile it collapses into an accordion so the footer
 * isn't a wall of ~23 stacked links; from `md:` up it renders as a plain
 * always-open column (no chevron, no toggle) exactly as it did before.
 * Desktop is forced open purely with CSS, so there's no media query in JS
 * and no hydration mismatch.
 */
export default function FooterLinkGroup({ title, links }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const headingId = useId();

  return (
    // A labelled landmark per column. Unlabelled, three <nav>s in a row are
    // all announced as "navigation" and a screen-reader user has to enter each
    // one to find out which is which; the heading they already read is the
    // obvious label, so it is reused rather than duplicated.
    <nav
      aria-labelledby={headingId}
      className="border-t border-white/10 md:border-t-0"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-bold text-white md:cursor-default md:pointer-events-none md:py-0"
      >
        <span id={headingId}>{title}</span>
        {/* Wrapper carries md:hidden — the global .material-symbols-rounded rule in
            globals.css overrides Tailwind's display utilities on the icon itself. */}
        <span className="md:hidden" aria-hidden="true">
          <span
            className={`material-symbols-rounded text-xl text-white/60 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </span>
      </button>

      <div
        id={panelId}
        className={`grid transition-all duration-200 md:grid-rows-[1fr] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          className={`overflow-hidden md:overflow-visible ${
            open ? "" : "invisible md:visible"
          }`}
        >
          <div className="grid gap-0 pb-2 text-sm md:gap-2 md:pb-0 md:pt-4">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-3 text-on-dark-muted transition hover:text-white md:py-0"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={
                    pathname === link.href.split("#")[0] ? "page" : undefined
                  }
                  className="block py-3 text-on-dark-muted transition hover:text-white aria-[current=page]:text-destiny-orange md:py-0"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
