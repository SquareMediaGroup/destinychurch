import type { ReactNode } from "react";
import AnimateIn from "@/components/AnimateIn";
import Icon from "@/components/ui/Icon";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * Words on one side, screens on the other, swapping sides down the page.
 * On a phone the screens come after the words.
 */
export default function FeatureRow({
  eyebrow,
  title,
  lead,
  points,
  flip = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  points?: { icon: string; text: ReactNode }[];
  flip?: boolean;
  /** The screen or screens. */
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <AnimateIn className={cn(flip && "lg:order-2")}>
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />
        {points && (
          <ul className="mt-8 space-y-4">
            {points.map((p, i) => (
              <li key={i} className="flex gap-3 text-base leading-relaxed text-destiny-grey">
                <Icon name={p.icon} size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        )}
      </AnimateIn>
      <AnimateIn delay={120} className={cn("flex justify-center", flip && "lg:order-1")}>
        {children}
      </AnimateIn>
    </div>
  );
}
