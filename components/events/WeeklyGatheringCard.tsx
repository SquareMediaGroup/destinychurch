import Link from "next/link";
import type { WeeklyGathering } from "@/lib/weeklyGatherings";

/**
 * A standing weekly gathering, styled like an EventCard. Shown in place of the
 * calendar feed when it can't be reached (see lib/weeklyGatherings.ts).
 */
export default function WeeklyGatheringCard({
  gathering,
  className = "",
}: {
  gathering: WeeklyGathering;
  className?: string;
}) {
  return (
    <Link
      href={gathering.href}
      className={`group block overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition hover:-translate-y-0.5 ${className}`}
    >
      <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-[#f5f7fa]">
        <span className="text-[52px] font-black leading-none tracking-[-0.03em] text-destiny-grey/20">
          {gathering.day}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
          Weekly
        </p>
        <h3
          style={{ fontFamily: "var(--font-roboto)" }}
          className="mt-1.5 text-[20px] font-semibold leading-[1.22] tracking-[-0.017em] text-destiny-grey"
        >
          {gathering.name}
        </h3>
        <p className="mt-1.5 text-sm text-muted">{gathering.when}</p>
        <p className="mt-0.5 text-sm text-subtle">{gathering.where}</p>
      </div>
    </Link>
  );
}
