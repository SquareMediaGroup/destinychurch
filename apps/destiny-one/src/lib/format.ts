// Dates, times and sizes as the design shows them (UK style, 24-hour clock).

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysAgo(iso: string, now = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY);
}

/** "09:14" */
export function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Chat list: "09:14", "Yesterday", "Tue", "12/09/26". */
export function listTime(iso: string): string {
  const n = daysAgo(iso);
  if (n <= 0) return clock(iso);
  if (n === 1) return "Yesterday";
  if (n < 7) return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Day separators in a conversation: "Today", "Yesterday", "Saturday", "12 September". */
export function dayLabel(iso: string): string {
  const n = daysAgo(iso);
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 7) return new Date(iso).toLocaleDateString("en-GB", { weekday: "long" });
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}

export function sameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

/** "PDF · 1.2 MB" */
export function fileMeta(mimeType: string, sizeBytes: number | null): string {
  const kind = mimeType === "application/pdf" ? "PDF" : mimeType.startsWith("image/") ? "Image" : "File";
  if (sizeBytes == null) return kind;
  const size = sizeBytes >= 1024 * 1024 ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${kind} · ${size}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
