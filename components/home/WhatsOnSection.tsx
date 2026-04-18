import Link from "next/link";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import EventsCarousel from "@/components/home/EventsCarousel";

type ChurchSuiteEvent = {
  id: number;
  name: string;
  datetime_start: string;
  datetime_end: string;
  location?: { name?: string } | null;
  signup_options?: { signup_enabled?: boolean } | null;
  images?: { original_500?: string; md?: string } | null;
  identifier?: string;
};

type DeduplicatedEvent = ChurchSuiteEvent & { sessionCount: number };

function deduplicateEvents(events: ChurchSuiteEvent[]): DeduplicatedEvent[] {
  const map = new Map<string, { event: ChurchSuiteEvent; count: number }>();
  for (const event of events) {
    const key = event.name.toLowerCase().trim();
    if (map.has(key)) {
      map.get(key)!.count++;
    } else {
      map.set(key, { event, count: 1 });
    }
  }
  return Array.from(map.values()).map(({ event, count }) => ({
    ...event,
    sessionCount: count,
  }));
}

async function getEvents(): Promise<ChurchSuiteEvent[]> {
  try {
    const res = await fetch(
      "https://destinytees.churchsuite.com/embed/calendar/json",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    date: d.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function EventCard({ event }: { event: DeduplicatedEvent }) {
  const start = formatDate(event.datetime_start);
  const end = formatDate(event.datetime_end);
  const imageUrl = event.images?.original_500 || event.images?.md;
  const href = event.identifier
    ? `https://destinytees.churchsuite.com/events/${event.identifier}`
    : "https://destinytees.churchsuite.com/events";
  const isCourse = event.sessionCount > 1;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-[240px] max-w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] sm:min-w-[280px] sm:max-w-[320px]"
    >
      {imageUrl ? (
        /* With image */
        <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-44">
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="320px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {isCourse && (
            <div className="absolute left-2.5 top-2.5 rounded-full bg-destiny-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
              {event.sessionCount} Sessions
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-white/95 shadow-lg backdrop-blur-sm sm:bottom-3 sm:right-3 sm:h-14 sm:w-14">
            <span className="text-lg font-black leading-none text-destiny-orange sm:text-xl">{start.day}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-destiny-grey/70 sm:text-[10px]">{start.month}</span>
          </div>
        </div>
      ) : (
        /* No image — branded header strip */
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-destiny-orange to-destiny-orange/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 sm:h-24 sm:w-24" />
          <div className="absolute -bottom-5 -left-3 h-14 w-14 rounded-full bg-white/10 sm:h-16 sm:w-16" />

          {isCourse && (
            <div className="mb-2.5 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {event.sessionCount} Sessions
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{start.month}</p>
              <p className="text-3xl font-black leading-none text-white sm:text-4xl">{start.day}</p>
            </div>
            <span className="text-2xl font-black text-white/20 sm:text-3xl">DC</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-3 text-sm font-bold leading-snug text-destiny-grey line-clamp-2 sm:text-base">
          {event.name}
        </h3>
        <div className="mt-auto space-y-1.5 text-xs text-destiny-grey/60">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
              <svg className="h-3 w-3 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span>{start.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
              <svg className="h-3 w-3 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>{start.time} – {end.time}</span>
          </div>
          {event.location?.name && (
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
                <svg className="h-3 w-3 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span>{event.location.name}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

function EventCardPlaceholder({ index }: { index: number }) {
  const placeholders = [
    { name: "Sunday Service", day: "SUN", month: "Weekly", location: "Destiny Centre" },
    { name: "Connect Groups", day: "WED", month: "Weekly", location: "Various Locations" },
    { name: "Prayer Meeting", day: "TUE", month: "Weekly", location: "Destiny Centre" },
  ];
  const item = placeholders[index % placeholders.length];

  return (
    <div className="min-w-[240px] max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md sm:min-w-[280px] sm:max-w-[320px]">
      <div className="relative h-36 w-full bg-gradient-to-br from-destiny-orange/20 to-destiny-orange/5 sm:h-44">
        <div className="flex h-full items-center justify-center">
          <span className="text-4xl font-black text-destiny-orange/30">DC</span>
        </div>
        <div className="absolute bottom-2 right-2 flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-destiny-orange text-white shadow-lg sm:bottom-3 sm:right-3 sm:h-14 sm:w-14">
          <span className="text-sm font-black leading-none">{item.day}</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-3 text-base font-bold text-destiny-grey">{item.name}</h3>
        <div className="space-y-1.5 text-xs text-destiny-grey/60">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{item.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function WhatsOnSection() {
  const rawEvents = await getEvents();
  const events = deduplicateEvents(rawEvents);
  const hasEvents = events.length > 0;

  return (
    <section className="bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <AnimateIn>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-black text-destiny-orange sm:text-3xl md:text-4xl">
              What&apos;s On
            </h2>
            <Link
              href="/whats-on"
              className="text-xs font-semibold text-destiny-grey/70 underline underline-offset-4 transition hover:text-destiny-grey sm:text-sm"
            >
              View Church Calendar
            </Link>
          </div>
        </AnimateIn>

        {/* Event cards carousel */}
        <AnimateIn delay={100}>
          <EventsCarousel>
            {hasEvents
              ? events.slice(0, 6).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <EventCardPlaceholder key={i} index={i} />
                ))}
          </EventsCarousel>
        </AnimateIn>

        {/* View all button */}
        <AnimateIn delay={200}>
          <div className="mt-6 text-center">
            <Link
              href="/whats-on"
              className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-8 py-3 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              View All
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
