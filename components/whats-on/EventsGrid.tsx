"use client";

import { useState } from "react";
import Image from "next/image";

type ChurchSuiteEvent = {
  id: number;
  name: string;
  datetime_start: string;
  datetime_end: string;
  location?: { name?: string } | null;
  images?: { original_500?: string; md?: string } | null;
  identifier?: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    date: d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

function EventCard({ event }: { event: ChurchSuiteEvent }) {
  const start = formatDate(event.datetime_start);
  const end = formatDate(event.datetime_end);
  const imageUrl = event.images?.original_500 || event.images?.md;
  const href = event.identifier
    ? `https://destinytees.churchsuite.com/events/${event.identifier}`
    : "https://destinytees.churchsuite.com/events";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md transition hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-destiny-orange/20 to-destiny-orange/5">
            <span className="text-4xl font-black text-destiny-orange/30">DC</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-destiny-orange text-white shadow-lg">
          <span className="text-lg font-black leading-none">{start.day}</span>
          <span className="text-[10px] font-bold uppercase">{start.month}</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-3 text-base font-bold text-destiny-grey line-clamp-2">{event.name}</h3>
        <div className="space-y-1.5 text-xs text-destiny-grey/60">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{start.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{start.time} – {end.time}</span>
          </div>
          {event.location?.name && (
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.location.name}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default function EventsGrid({ events }: { events: ChurchSuiteEvent[] }) {
  const [search, setSearch] = useState("");

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Search */}
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
          <svg className="h-4 w-4 shrink-0 text-destiny-grey/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-destiny-grey placeholder-destiny-grey/40 outline-none"
          />
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-destiny-grey/40">
            <p className="text-lg font-semibold">No events found</p>
            <p className="mt-1 text-sm">Try a different search term</p>
          </div>
        )}
      </div>
    </section>
  );
}
