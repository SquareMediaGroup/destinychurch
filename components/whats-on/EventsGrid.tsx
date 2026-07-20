"use client";

import { useState } from "react";
import Image from "next/image";
import {
  type ChurchSuiteEvent,
  type DeduplicatedEvent,
  churchSuiteEventUrl,
  deduplicateEvents,
} from "@destiny/shared";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    fullDate: d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    shortDate: d.toLocaleDateString("en-GB", {
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
  const href = churchSuiteEventUrl(event.identifier);
  const isCourse = event.sessionCount > 1;
  const isMultiday = new Date(event.datetime_start).toDateString() !== new Date(event.datetime_end).toDateString();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
    >
      {imageUrl ? (
        /* With image */
        <div className="relative h-48 w-full shrink-0 overflow-hidden">
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex items-center gap-2">
            {isMultiday && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                Multiday
              </div>
            )}
            {isCourse && (
              <div className="flex items-center gap-1.5 rounded-full bg-destiny-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                {event.sessionCount} Sessions
              </div>
            )}
          </div>

          <div className="absolute bottom-3 right-3 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white/95 shadow-lg backdrop-blur-sm">
            <span className="text-xl font-black leading-none text-destiny-orange">{start.day}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-destiny-grey/70">{start.month}</span>
          </div>
        </div>
      ) : (
        /* No image — branded header strip */
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-destiny-orange to-destiny-orange/80 px-5 pb-5 pt-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-3 h-16 w-16 rounded-full bg-white/10" />

          <div className="mb-3 flex items-center gap-2">
            {isMultiday && (
              <div className="inline-flex items-center rounded-full bg-red-500/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Multiday
              </div>
            )}
            {isCourse && (
              <div className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                {event.sessionCount} Sessions
              </div>
            )}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{start.month}</p>
              <p className="text-4xl font-black leading-none text-white">{start.day}</p>
            </div>
            <span className="text-3xl font-black text-white/20">DC</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-4 text-base font-bold leading-snug text-destiny-grey line-clamp-2">
          {event.name}
        </h3>

        <div className="mt-auto space-y-2 text-xs text-destiny-grey/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
              <svg className="h-3.5 w-3.5 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium text-destiny-grey/80">
              {isMultiday ? `${start.fullDate} – ${end.fullDate}` : start.fullDate}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
              <svg className="h-3.5 w-3.5 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>{start.time} – {end.time}</span>
          </div>

          {event.location?.name && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destiny-orange/10">
                <svg className="h-3.5 w-3.5 text-destiny-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span>{event.location.name}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-destiny-orange">
          <span>{isCourse ? "View course" : "Find out more"}</span>
          <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </a>
  );
}

export default function EventsGrid({ events }: { events: ChurchSuiteEvent[] }) {
  const [search, setSearch] = useState("");
  const deduplicated = deduplicateEvents(events);

  const filtered = deduplicated.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="events" className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Search */}
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-black/8 bg-gray-50 px-4 py-3 shadow-sm transition-shadow focus-within:border-destiny-orange/30 focus-within:shadow-md">
          <svg className="h-4 w-4 shrink-0 text-destiny-grey/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events…"
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
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
              <svg className="h-8 w-8 text-destiny-orange/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-destiny-grey/60">No events found</p>
            <p className="mt-1 text-sm text-destiny-grey/40">Try a different search term</p>
          </div>
        )}
      </div>
    </section>
  );
}
