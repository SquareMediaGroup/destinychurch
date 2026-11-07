import { STATUS_PAGE_URL } from "@/lib/outage";

/**
 * The inline fail state for a section whose content couldn't be loaded.
 *
 * Says plainly that something is wrong (never "nothing here", which is what an
 * empty list used to claim during an outage) and points at the status page.
 * Copy must not name the services behind the site.
 */
export default function ServiceUnavailable({
  title = "We can't load this right now",
  children,
  className = "",
  tone = "light",
}: {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      role="status"
      className={`mx-auto max-w-xl rounded-2xl border px-6 py-10 text-center ${
        dark ? "border-white/10 bg-white/5" : "border-black/[0.07] bg-white"
      } ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10">
        <span className="material-symbols-rounded text-3xl text-destiny-orange" aria-hidden="true">
          cloud_off
        </span>
      </div>
      <p className={`text-lg font-bold ${dark ? "text-white" : "text-destiny-grey"}`}>{title}</p>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-on-dark-muted" : "text-muted"}`}>
        {children ?? "Part of our website is having trouble at the moment. Please try again in a little while."}
      </p>
      <a
        href={STATUS_PAGE_URL}
        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange"
      >
        <span className="underline underline-offset-4 group-hover:no-underline">Check service status</span>
        <span className="material-symbols-rounded text-base" aria-hidden="true">arrow_forward</span>
      </a>
    </div>
  );
}
