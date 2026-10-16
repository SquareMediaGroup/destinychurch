// Display helpers. British English, London time, as the church uses.

const TZ = "Europe/London";

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dayKey(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: TZ });
}

/** "09:14" today, "Yesterday", "Tue" this week, else "3 Oct". For list rows. */
export function shortTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short" });
  return d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** "Today 09:40", "Yesterday 20:05", "Mon 21:12", "3 Oct 14:05". */
export function whenTime(iso: string): string {
  const s = shortTime(iso);
  const t = clockTime(iso);
  return s === t ? `Today ${t}` : `${s} ${t}`;
}

/** Day separator in a conversation: "Today", "Yesterday", "Saturday", "3 October". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return "Today";
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long" });
  return d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function sameDay(a: string, b: string): boolean {
  return dayKey(new Date(a)) === dayKey(new Date(b));
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
}

export function dateAndTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "short" })} at ${clockTime(iso)}`;
}

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
