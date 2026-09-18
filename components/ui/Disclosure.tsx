import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";

/**
 * An expand/collapse row, built on `<details>`/`<summary>`.
 *
 * The site had three incompatible accordions and one non-accordion: /visit's
 * FAQ is seven permanently-open `<div>`s whose questions are `<p>` elements,
 * even though the page ships `FAQPage` structured data describing them as
 * questions and answers. Seven open answers make that section about 1,400px
 * tall, and nothing in the markup says the questions are questions.
 *
 * `<details>` is used rather than a `useState` toggle because the browser gives
 * us the whole interaction for free and gets it right: keyboard operation,
 * `aria-expanded` on the summary, correct role mapping, and — importantly —
 * in-page search (Ctrl+F) and deep links can open a closed section, which a
 * JS-only accordion breaks.
 *
 * It is a server component with no client JS at all.
 *
 * Note this is one independent disclosure, not a one-at-a-time accordion.
 * For an FAQ that is the right behaviour: collapsing the answer someone is
 * reading because they opened another one is a well-earned usability
 * complaint.
 */

export default function Disclosure({
  summary,
  defaultOpen,
  className,
  children,
}: {
  summary: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-card border border-hairline bg-white transition duration-300 ease-standard",
        "open:shadow-card",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4",
          "text-left text-base font-bold text-destiny-grey",
          // Safari still paints its own triangle without this.
          "[&::-webkit-details-marker]:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange focus-visible:ring-offset-2",
          "rounded-card",
        )}
      >
        {summary}
        <Icon
          name="expand_more"
          size="lg"
          className="shrink-0 text-destiny-orange transition-transform duration-300 ease-standard group-open:rotate-180"
        />
      </summary>

      <div className="px-5 pb-5 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </details>
  );
}
