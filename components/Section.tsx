import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  kicker?: string;
  title?: string;
  description?: string;
  align?: "left" | "center";
  bleed?: boolean;
  background?: string;
  spacing?: "tight" | "default" | "loose";
  className?: string;
  children: ReactNode;
};

export default function Section({
  id,
  kicker,
  title,
  description,
  align = "left",
  bleed = false,
  background = "",
  spacing = "default",
  className = "",
  children,
}: SectionProps) {
  const spacingClasses: Record<typeof spacing, string> = {
    tight: "py-10",
    default: "py-14",
    loose: "py-20",
  };

  const contentAlignment =
    align === "center" ? "text-center mx-auto" : "text-left";

  const container = bleed ? "w-full" : "mx-auto max-w-7xl";
  const padding = bleed ? "" : "px-4 lg:px-8";

  return (
    <section id={id} className={`relative ${background}`}>
      <div
        className={`${container} ${padding} ${spacingClasses[spacing]} ${className}`}
      >
        {(kicker || title || description) && (
          <div
            className={`mb-8 max-w-3xl space-y-3 ${contentAlignment}`}
          >
            {kicker && (
              <p className="subheading text-xs font-semibold uppercase tracking-[0.16em] text-destiny-orange">
                {kicker}
              </p>
            )}
            {title && (
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-base text-[var(--foreground)]/80">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
