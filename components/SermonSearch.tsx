"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import SermonCard from "./SermonCard";
import { Sermon } from "@/lib/types";

type SermonSearchProps = {
  sermons: Sermon[];
};

type SearchFilters = {
  terms: string[];
  speakers: string[];
  tags: string[];
};

type SearchableSermon = {
  sermon: Sermon;
  searchable: {
    title: string;
    speaker: string;
    summary: string;
    transcript: string;
    tags: string[];
    date: string;
  };
  keywordSet: Set<string>;
};

const normalize = (value?: string | null) => value?.toLowerCase().trim() ?? "";

const tokenize = (value?: string | null) =>
  normalize(value)
    .split(/\s+/)
    .filter(Boolean);

const tokenizeQuery = (input: string) => {
  const tokens: string[] = [];
  let buffer = "";
  let inQuotes = false;

  for (const char of input.trim()) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === " " && !inQuotes) {
      if (buffer) {
        tokens.push(buffer.toLowerCase());
        buffer = "";
      }
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    tokens.push(buffer.toLowerCase());
  }

  return tokens;
};

const parseQuery = (raw: string): SearchFilters => {
  const parts = tokenizeQuery(raw);
  const filters: SearchFilters = { terms: [], speakers: [], tags: [] };

  parts.forEach((part) => {
    if (part.startsWith("speaker:")) {
      filters.speakers.push(part.replace("speaker:", "").trim());
    } else if (part.startsWith("tag:")) {
      filters.tags.push(part.replace("tag:", "").trim());
    } else if (part.length) {
      filters.terms.push(part);
    }
  });

  return filters;
};

const buildIndex = (sermon: Sermon): SearchableSermon => {
  const tags = sermon.tags?.map(normalize).filter(Boolean) ?? [];
  const title = normalize(sermon.title);
  const speaker = normalize(sermon.speaker ?? "Destiny Church");
  const summary = normalize(sermon.summary);
  const transcript = normalize(sermon.transcript);
  const date = normalize(sermon.date);

  const keywordSet = new Set<string>([
    ...tokenize(sermon.title),
    ...tokenize(sermon.speaker),
    ...tags.flatMap((tag) => tag.split(/\s+/)),
  ]);

  return {
    sermon,
    searchable: { title, speaker, summary, transcript, tags, date },
    keywordSet,
  };
};

const isNearMatch = (keyword: string, token: string) => {
  if (token.length < 4) return false;
  if (Math.abs(keyword.length - token.length) > 2) return false;

  let edits = 0;
  let i = 0;
  let j = 0;

  while (i < keyword.length && j < token.length) {
    if (keyword[i] === token[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (keyword.length > token.length) {
      i += 1;
    } else if (token.length > keyword.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  return true;
};

const scoreSermon = (entry: SearchableSermon, filters: SearchFilters) => {
  const { terms, speakers, tags } = filters;
  const { title, speaker, summary, transcript, tags: sermonTags, date } = entry.searchable;

  if (speakers.length && !speakers.some((needle) => speaker.includes(needle))) {
    return 0;
  }

  if (tags.length && !tags.every((needle) => sermonTags.some((tag) => tag.includes(needle)))) {
    return 0;
  }

  if (!terms.length && !speakers.length && !tags.length) {
    return 1; // neutral score when nothing is typed
  }

  let score = 0;

  for (const term of terms) {
    const inTitle = title.includes(term);
    const inSpeaker = speaker.includes(term);
    const inTags = sermonTags.some((tag) => tag.includes(term));
    const inSummary = summary.includes(term);
    const inTranscript = transcript.includes(term);
    const inDate = date.includes(term);
    const nearMatch =
      !inTitle && !inSpeaker && !inTags && entry.keywordSet.size > 0
        ? Array.from(entry.keywordSet).some((keyword) => isNearMatch(keyword, term))
        : false;

    if (!inTitle && !inSpeaker && !inTags && !inSummary && !inTranscript && !inDate && !nearMatch) {
      return 0;
    }

    if (inTitle) score += 9;
    if (title.startsWith(term)) score += 2;
    if (inSpeaker) score += 7;
    if (inTags) score += 5;
    if (inSummary) score += 3;
    if (inTranscript) score += 2;
    if (inDate) score += 2;
    if (nearMatch) score += 2;
  }

  return score;
};

export default function SermonSearch({ sermons }: SermonSearchProps) {
  const [query, setQuery] = useState("");

  const searchableSermons = useMemo(() => sermons.map((sermon) => buildIndex(sermon)), [sermons]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return sermons;

    const filters = parseQuery(trimmed);

    return searchableSermons
      .map((entry) => ({
        sermon: entry.sermon,
        score: scoreSermon(entry, filters),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const dateB = new Date(b.sermon.date).getTime();
        const dateA = new Date(a.sermon.date).getTime();
        return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
      })
      .map(({ sermon }) => sermon);
  }, [query, searchableSermons, sermons]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white/80 p-3 shadow-sm backdrop-blur-sm sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="group flex items-center gap-3 rounded-xl border border-destiny-black/5 bg-[var(--surface)]/90 px-3 py-2 shadow-inner transition focus-within:ring-2 focus-within:ring-destiny-orange/30">
            <Icon name="search" size={18} className="text-destiny-grey/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search sermons by title, speaker, tag (tip: try "speaker:anna")'
              aria-label="Search sermons"
              enterKeyHint="search"
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-destiny-grey/70 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-destiny-grey/80 transition hover:bg-destiny-grey/10"
                aria-label="Clear search"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-destiny-grey">
            <Icon name="insights" size={16} className="text-destiny-orange" />
            <span className="font-semibold text-destiny-black">{results.length}</span> of {sermons.length} results ·
            <span className="font-semibold text-destiny-black">speaker:</span> and <span className="font-semibold text-destiny-black">tag:</span> filters work here.
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-6 text-sm text-destiny-grey">
          <Icon name="travel_explore" size={18} />
          <div>
            No sermons match “{query}”. Try another title, add/remove a{" "}
            <span className="font-semibold text-destiny-black">speaker:</span> or{" "}
            <span className="font-semibold text-destiny-black">tag:</span> filter, or simplify the keywords.
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((sermon, index) => (
            <SermonCard
              key={sermon.id}
              sermon={sermon}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
