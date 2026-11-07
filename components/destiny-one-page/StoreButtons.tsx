import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * "Pre-order on the App Store" and "Pre-register on Google Play".
 *
 * These are the site's own pill buttons, not the stores' badges. Apple's
 * "Pre-order on the App Store" badge may only be used once a listing actually
 * takes pre-orders, and the official badges are a swap for launch day (Apple's
 * and Google's guidelines both say to switch to the download badge on
 * release). Until then a store name in plain text is the honest label.
 *
 * A store without a web link yet (see lib/destinyOne/storeLinks.ts) shows the
 * same shape as an outline reading "Coming soon to the App Store", instead of
 * a button that goes nowhere.
 */
export default function StoreButtons({
  ios,
  android,
  tone = "light",
  className,
}: {
  ios: string | null;
  android: string | null;
  /** `dark` for a dark band. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const stores = [
    { key: "ios", href: ios, icon: "phone_iphone", action: "Pre-order on the", store: "App Store", soon: "Coming soon to the" },
    { key: "android", href: android, icon: "android", action: "Pre-register on", store: "Google Play", soon: "Coming soon to" },
  ];
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      {stores.map((s) =>
        s.href ? (
          <a
            key={s.key}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex min-h-[56px] items-center gap-3 rounded-2xl px-5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange focus-visible:ring-offset-2",
              dark ? "bg-white text-destiny-grey hover:bg-white/90" : "bg-destiny-grey text-white hover:brightness-110",
            )}
          >
            <Icon name={s.icon} size="xl" />
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold opacity-75">{s.action}</span>
              <span className="block text-base font-bold">{s.store}</span>
            </span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span
            key={s.key}
            className={cn(
              "inline-flex min-h-[56px] items-center gap-3 rounded-2xl border px-5 py-2.5 text-left",
              dark ? "border-white/25 text-white" : "border-black/15 text-destiny-grey",
            )}
          >
            <Icon name={s.icon} size="xl" />
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold opacity-75">{s.soon}</span>
              <span className="block text-base font-bold">{s.store}</span>
            </span>
          </span>
        ),
      )}
    </div>
  );
}
