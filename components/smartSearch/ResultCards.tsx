"use client";

// Result cards rendered inside the Smart Search chat panel when a tool answers.
// Styled for Smart Search's dark glass surface (white text, orange accents) —
// intentionally NOT the shop's light theme. The product card mirrors the buy
// logic in components/shop/ProductBuyPanel.tsx so a visitor can pick a
// size/colour and add to the cart without leaving the conversation.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/cart-store";
import { MAX_CARDS, type CardAction, type InfoCardData, type PersonCardData } from "@destiny/shared";
import { formatPrice, sizeIndex, type CartItem } from "@/lib/shop";
import type {
  ProductResult,
  ProductResultVariant,
  SermonResult,
  EventResult,
  WeatherToolResult,
  DirectionsToolResult,
  SearchWebResult,
} from "@/lib/smartSearch/tools";

function UnavailableNote({ reason }: { reason?: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-on-dark-subtle">
      {reason ?? "That lookup isn't available right now."}
    </div>
  );
}

// ── Weather ──────────────────────────────────────────────────────────────────

function weatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "thunderstorm";
  if (c.includes("snow")) return "ac_unit";
  if (c.includes("fog")) return "foggy";
  if (c.includes("drizzle") || c.includes("rain")) return "rainy";
  if (c.includes("overcast") || c.includes("cloud")) return "cloud";
  return "wb_sunny";
}

function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

export function WeatherResultCard({ data }: { data: WeatherToolResult }) {
  if (!data.available) return <UnavailableNote reason={data.reason} />;

  return (
    <div className="mt-2 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="material-symbols-rounded text-4xl text-destiny-orange" aria-hidden="true">
        {weatherIcon(data.condition ?? "")}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-dark-subtle">
          {data.location} &middot; {data.date ? formatDate(data.date) : ""}
        </p>
        <p className="mt-0.5 text-base font-black text-white">
          {data.condition}, {data.tempMinC}&deg;&ndash;{data.tempMaxC}&deg;C
        </p>
        {typeof data.precipitationChance === "number" && (
          <p className="mt-0.5 text-sm text-on-dark-subtle">{data.precipitationChance}% chance of rain</p>
        )}
      </div>
    </div>
  );
}

// ── Directions ───────────────────────────────────────────────────────────────

export function DirectionsResultCard({ data }: { data: DirectionsToolResult }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {data.available && data.embedUrl ? (
        <iframe
          src={data.embedUrl}
          className="aspect-video w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Map to Destiny Centre"
        />
      ) : null}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="min-w-0 truncate text-sm font-bold text-white/85">{data.address}</p>
        <a
          href={data.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-semibold text-destiny-orange hover:underline"
        >
          Open in Maps
        </a>
      </div>
    </div>
  );
}

// ── Web search ───────────────────────────────────────────────────────────────

export function WebResultsCard({ data }: { data: SearchWebResult }) {
  if (!data.available) return <UnavailableNote reason={data.reason} />;
  if (!data.results?.length) return <UnavailableNote reason="No results found." />;

  return (
    <div className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">
      {data.results.map((r) => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl px-3 py-2 transition hover:bg-white/8"
        >
          <p className="truncate text-sm font-bold text-white/85">{r.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-on-dark-subtle">{r.snippet}</p>
        </a>
      ))}
    </div>
  );
}

// ── Sermons ──────────────────────────────────────────────────────────────────

function formatSermonDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function SermonResultCard({ sermon }: { sermon: SermonResult }) {
  const date = formatSermonDate(sermon.publishedAt);
  return (
    <Link
      href={sermon.url}
      className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/8"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sermon.thumbnail}
        alt=""
        className="h-16 w-24 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-white">{sermon.title}</p>
        <p className="mt-0.5 truncate text-xs text-on-dark-subtle">
          {[sermon.speaker, date].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export function SermonResultCards({ sermons }: { sermons: SermonResult[] }) {
  if (sermons.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {sermons.map((s) => (
        <SermonResultCard key={s.id} sermon={s} />
      ))}
    </div>
  );
}

// ── Events ───────────────────────────────────────────────────────────────────

/** How many events the chat shows as cards; the model still sees the full list. */
const MAX_EVENT_CARDS = 3;

function EventResultCard({ event }: { event: EventResult }) {
  const more = event.totalUpcomingDates > 1 ? `+${event.totalUpcomingDates - 1} more dates` : null;
  return (
    <Link
      href={event.url}
      className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/8"
    >
      {event.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.thumbnailUrl} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/20 text-xs font-bold uppercase tracking-wide text-white/80">
          Event
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-white">{event.name}</p>
        {event.next && <p className="mt-0.5 truncate text-xs text-on-dark-subtle">{event.next}</p>}
        <p className="truncate text-xs text-on-dark-subtle">
          {[event.location?.split(",")[0], more].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export function EventResultCards({ events }: { events: EventResult[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {events.slice(0, MAX_EVENT_CARDS).map((e) => (
        <EventResultCard key={e.seriesKey} event={e} />
      ))}
    </div>
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

/** Effective price of a variant: its override, else the product base price. */
function variantPennies(variant: ProductResultVariant, basePennies: number): number {
  return variant.price_pennies ?? basePennies;
}

function ProductResultCard({ product }: { product: ProductResult }) {
  const toast = useToast();
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  const active = product.variants;

  const colors = useMemo(() => {
    const seen = new Map<string, string | null>(); // color -> hex
    active.forEach((v) => {
      if (v.color && !seen.has(v.color)) seen.set(v.color, v.color_hex);
    });
    return [...seen.entries()].map(([color, hex]) => ({ color, hex }));
  }, [active]);
  const sizes = useMemo(
    () =>
      [...new Set(active.map((v) => v.size).filter(Boolean))].sort(
        (a, b) => sizeIndex(a) - sizeIndex(b),
      ),
    [active],
  );
  const hasColor = colors.length > 0;
  const hasSize = sizes.length > 0;

  const [selColor, setSelColor] = useState<string>(hasColor ? colors[0].color : "");
  const [selSize, setSelSize] = useState<string>(hasSize ? sizes[0] : "");

  const stockFor = (color: string, size: string): number =>
    active
      .filter((v) => v.color === color && v.size === size)
      .reduce((n, v) => n + v.stock, 0);

  const colorAvailable = (color: string) =>
    active.some((v) => v.color === color && v.stock > 0);
  const sizeAvailable = (size: string) => stockFor(selColor, size) > 0;

  const selected: ProductResultVariant | undefined = useMemo(
    () => active.find((v) => v.color === selColor && v.size === (hasSize ? selSize : "")),
    [active, selColor, selSize, hasSize],
  );

  const inStock = (selected?.stock ?? 0) > 0;
  const price = selected
    ? variantPennies(selected, product.basePennies)
    : product.fromPennies;

  function handleAdd() {
    if (!selected || !inStock) {
      toast.error("That option isn't available right now.");
      return;
    }
    const item: CartItem = {
      productId: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.name,
      size: selected.size,
      color: selected.color,
      colorHex: selected.color_hex,
      unitPricePennies: variantPennies(selected, product.basePennies),
      image: product.image,
      quantity: 1,
    };
    add(item);
    setAdded(true);
    toast.success(`${product.name} added to your basket.`, "Added");
  }

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex gap-3 p-3">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/30">
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">apparel</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/shop/${product.slug}`}
            className="block truncate text-sm font-bold text-white transition hover:text-destiny-orange"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 text-xs text-on-dark-subtle">{product.fitLabel}</p>
          <p className="mt-0.5 text-sm font-black text-white">
            {selected ? formatPrice(price) : `from ${formatPrice(price)}`}
          </p>
        </div>
      </div>

      {/* Colour */}
      {hasColor && (
        <div className="px-3">
          <div className="flex flex-wrap gap-2">
            {colors.map(({ color, hex }) => {
              const avail = colorAvailable(color);
              const isSel = color === selColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelColor(color);
                    setAdded(false);
                    if (hasSize && stockFor(color, selSize) <= 0) {
                      const firstAvail = sizes.find((s) => stockFor(color, s) > 0);
                      setSelSize(firstAvail ?? sizes[0]);
                    }
                  }}
                  title={color}
                  aria-label={color}
                  aria-pressed={isSel}
                  className={`relative h-7 w-7 rounded-full border transition ${
                    isSel
                      ? "border-destiny-orange ring-2 ring-destiny-orange/40"
                      : "border-white/20 hover:border-white/50"
                  } ${!avail ? "opacity-40" : ""}`}
                  style={{ backgroundColor: hex || "#e5e7eb" }}
                >
                  {!avail && (
                    <span className="absolute inset-0 m-auto h-px w-5 rotate-45 bg-white/70" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size */}
      {hasSize && (
        <div className="mt-2 px-3">
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size) => {
              const avail = sizeAvailable(size);
              const isSel = size === selSize;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!avail}
                  onClick={() => {
                    setSelSize(size);
                    setAdded(false);
                  }}
                  aria-pressed={isSel}
                  className={`min-w-[2.25rem] rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    isSel
                      ? "border-destiny-orange bg-destiny-orange text-white"
                      : "border-white/20 text-white/80 hover:border-destiny-orange"
                  } ${!avail ? "cursor-not-allowed border-white/5 text-white/25 line-through" : ""}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add to basket */}
      <div className="p-3">
        <Button
          type="button"
          variant="primary"
          shape="pill"
          size="xs"
          fullWidth
          onClick={handleAdd}
          disabled={!inStock}
        >
          <span className="material-symbols-rounded text-base" aria-hidden="true">
            {added ? "check" : "shopping_bag"}
          </span>
          {inStock ? (added ? "Added to basket" : "Add to basket") : "Sold out"}
        </Button>
      </div>
    </div>
  );
}

export function ProductResultCards({ products }: { products: ProductResult[] }) {
  if (products.length === 0) return null;
  return (
    <div className="space-y-2">
      {products.map((p) => (
        <ProductResultCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// ── Church cards: people and info ────────────────────────────────────────────
// Built on the server from structured data (lib/team.ts, lib/ministries.ts,
// lib/giving.ts ...) so nothing on them is written by the model.

/** A button-style link that handles site paths, external URLs, mailto: and tel:. */
function CardLink({ action, primary }: { action: CardAction; primary?: boolean }) {
  const cls = `inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
    primary
      ? "bg-destiny-orange text-white hover:brightness-110"
      : "border border-white/20 text-white/85 hover:border-destiny-orange hover:text-white"
  }`;
  if (action.href.startsWith("/")) {
    return (
      <Link href={action.href} className={cls}>
        {action.label}
      </Link>
    );
  }
  const external = /^https?:/.test(action.href);
  return (
    <a
      href={action.href}
      className={cls}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {action.label}
    </a>
  );
}

function PersonResultCard({ person }: { person: PersonCardData }) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex gap-3 p-3">
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo} alt={person.name} className="h-24 w-[4.5rem] shrink-0 rounded-xl bg-[#f5f3ef] object-contain" />
        ) : (
          <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-xl bg-destiny-orange/20 text-xl font-black text-white/70">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-white">{person.name}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-destiny-orange">{person.role}</p>
          {person.bio && <p className="mt-1.5 text-xs leading-relaxed text-white/80">{person.bio}</p>}
          {person.leads.length > 0 && (
            <p className="mt-1.5 text-xs text-on-dark-subtle">Leads: {person.leads.join(", ")}</p>
          )}
        </div>
      </div>
      {(person.email || person.href) && (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {person.email && <CardLink primary action={{ label: "Email", href: `mailto:${person.email}` }} />}
          {person.href && <CardLink action={{ label: "Learn more", href: person.href }} />}
        </div>
      )}
    </div>
  );
}

export function PersonResultCards({ people }: { people: PersonCardData[] }) {
  if (people.length === 0) return null;
  return (
    <div>
      {people.slice(0, MAX_CARDS).map((p) => (
        <PersonResultCard key={p.id} person={p} />
      ))}
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy that. Please select the text instead.");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-bold text-white/80 transition hover:border-destiny-orange hover:text-white"
    >
      <span className="material-symbols-rounded text-sm" aria-hidden="true">
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function InfoResultCard({ card }: { card: InfoCardData }) {
  const isLive = card.variant === "live" && card.eyebrow === "Live now";
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {card.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image} alt="" className="h-28 w-full object-cover" />
      )}
      <div className="p-3">
        {card.eyebrow && (
          <p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${isLive ? "text-red-400" : "text-destiny-orange"}`}>
            {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />}
            {card.eyebrow}
          </p>
        )}
        <p className="mt-0.5 text-base font-black text-white">{card.title}</p>
        {card.summary && <p className="mt-1 text-xs leading-relaxed text-white/80">{card.summary}</p>}

        {card.facts.length > 0 && (
          <dl className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
            {card.facts.map((f) => (
              <div key={f.label} className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-on-dark-subtle">{f.label}</dt>
                <dd className="flex min-w-0 items-center text-right text-xs font-semibold text-white/90">
                  <span className="min-w-0 break-words">{f.value}</span>
                  {f.copy && <CopyButton value={f.value} label={f.label} />}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {card.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {card.actions.map((a, i) => (
              <CardLink key={a.href + a.label} action={a} primary={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoResultCards({ cards }: { cards: InfoCardData[] }) {
  if (cards.length === 0) return null;
  return (
    <div>
      {cards.slice(0, MAX_CARDS).map((c) => (
        <InfoResultCard key={c.id} card={c} />
      ))}
    </div>
  );
}
