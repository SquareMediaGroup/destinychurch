import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Apple's own product bezels (Apple Design Resources: iPhone 18 Pro, MacBook
 * Pro 14"), the same frames as the campaign films, in public/img/frames/.
 *
 * Licence note, decided by the church: Apple's Design Resources licence covers
 * mock-ups of software that runs only on Apple platforms, which Destiny One
 * (also on Android) and the website are not. The church chose to use them
 * anyway. Swap these components for frameless screens if that changes.
 *
 * Screen openings are measured from Apple's PNGs and given as percentages, so
 * the frames scale with their container:
 *   iPhone   1350x2760, screen at (72, 69), 1206x2622, corner radius 190
 *   MacBook  3860x2540, screen at (418, 288), 3024x1964
 */

const PHONE = { w: 1350, h: 2760, x: 72, y: 69, sw: 1206, sh: 2622, r: 190 };
const MAC = { w: 3860, h: 2540, x: 418, y: 288, sw: 3024, sh: 1964 };
const pct = (a: number, b: number) => `${(a / b) * 100}%`;

/** iOS status bar drawn as SVG on a 402pt-wide, 62pt-tall box, so it scales with the screen. */
function StatusBar({ dark }: { dark?: boolean }) {
  const ink = dark ? "#fff" : "#000";
  return (
    <svg viewBox="0 0 402 62" className="absolute inset-x-0 top-0 w-full" aria-hidden>
      <text x="58" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontSize="17" fontWeight="600" fill={ink}>
        9:41
      </text>
      <g fill={ink} transform="translate(308 26)">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5" width="3" height="7" rx="1" />
        <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </g>
      <g transform="translate(332 25.5)">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke={ink} strokeOpacity="0.4" />
        <rect x="2" y="2" width="20" height="9" rx="2.5" fill={ink} />
        <path d="M25 4.5v4a2 2 0 0 0 0-4z" fill={ink} fillOpacity="0.4" />
      </g>
    </svg>
  );
}

/**
 * An iPhone 18 Pro with content on its screen. Content sits below the 62pt
 * status bar (the app screenshots are 402x812pt), unless `fullScreen`.
 */
export function IPhoneFrame({
  children,
  color = "silver",
  dark = false,
  className,
}: {
  children: ReactNode;
  color?: "silver" | "black";
  /** Dark screen: dark status bar background, white status text. */
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: `${PHONE.w} / ${PHONE.h}` }}>
      <div
        className="absolute overflow-hidden"
        style={{
          left: pct(PHONE.x, PHONE.w),
          top: pct(PHONE.y, PHONE.h),
          width: pct(PHONE.sw, PHONE.w),
          height: pct(PHONE.sh, PHONE.h),
          borderRadius: `${pct(PHONE.r, PHONE.sw)} / ${pct(PHONE.r, PHONE.sh)}`,
          background: dark ? "#1A110A" : "#fff",
        }}
      >
        <StatusBar dark={dark} />
        <div className="absolute inset-x-0 bottom-0" style={{ top: pct(62, 874) }}>
          {children}
        </div>
      </div>
      <Image
        src={`/img/frames/iphone-18-pro-${color}.webp`}
        alt=""
        fill
        sizes="(min-width: 1024px) 340px, 70vw"
        className="pointer-events-none select-none drop-shadow-[0_24px_40px_rgba(16,24,40,.22)]"
        draggable={false}
      />
    </div>
  );
}

/** A MacBook Pro 14" with content filling its 1512x982pt screen. */
export function MacBookFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: `${MAC.w} / ${MAC.h}` }}>
      <div
        className="absolute overflow-hidden bg-white"
        style={{ left: pct(MAC.x, MAC.w), top: pct(MAC.y, MAC.h), width: pct(MAC.sw, MAC.w), height: pct(MAC.sh, MAC.h) }}
      >
        {children}
      </div>
      <Image
        src="/img/frames/macbook-pro-14-silver.webp"
        alt=""
        fill
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
}
