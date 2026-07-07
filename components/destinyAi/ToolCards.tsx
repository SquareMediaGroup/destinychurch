import type { WeatherToolResult, DirectionsToolResult, SearchWebResult } from "@/lib/destinyAi/tools";

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

function UnavailableNote({ reason }: { reason?: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey/50">
      {reason ?? "That lookup isn't available right now."}
    </div>
  );
}

export function WeatherCard({ data }: { data: WeatherToolResult }) {
  if (!data.available) return <UnavailableNote reason={data.reason} />;

  return (
    <div className="mt-2 flex items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 py-4">
      <span className="material-symbols-rounded text-4xl text-destiny-orange">
        {weatherIcon(data.condition ?? "")}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-destiny-grey/40">
          {data.location} &middot; {data.date ? formatDate(data.date) : ""}
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-heading)] text-lg font-black text-destiny-grey">
          {data.condition}, {data.tempMinC}&deg;&ndash;{data.tempMaxC}&deg;C
        </p>
        {typeof data.precipitationChance === "number" && (
          <p className="mt-0.5 text-sm text-destiny-grey/50">
            {data.precipitationChance}% chance of rain
          </p>
        )}
      </div>
    </div>
  );
}

export function DirectionsCard({ data }: { data: DirectionsToolResult }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white">
      {data.available && data.embedUrl ? (
        <iframe
          src={data.embedUrl}
          className="aspect-video w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Map to Destiny Centre"
        />
      ) : (
        <div className="px-5 py-4 text-sm text-destiny-grey/50">Map preview isn&apos;t configured yet.</div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3">
        <p className="min-w-0 truncate text-sm font-bold text-destiny-grey">{data.address}</p>
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

export function SearchResultsCard({ data }: { data: SearchWebResult }) {
  if (!data.available) return <UnavailableNote reason={data.reason} />;
  if (!data.results?.length) return <UnavailableNote reason="No results found." />;

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-black/10 bg-white p-3">
      {data.results.map((r) => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl px-3 py-2 transition hover:bg-destiny-orange/5"
        >
          <p className="truncate text-sm font-bold text-destiny-grey">{r.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-destiny-grey/50">{r.snippet}</p>
        </a>
      ))}
    </div>
  );
}
