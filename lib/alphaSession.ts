export type AlphaFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "custom"
  | "one_off";

export interface AlphaSessionInfo {
  date: Date;
  isFirst: boolean;
  isPast: boolean;
}

function dayOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getNextAlphaSession(
  startDate: string | Date,
  frequency: string | null | undefined,
  customIntervalDays?: number | null,
  now: Date = new Date()
): AlphaSessionInfo {
  const startRaw =
    typeof startDate === "string" ? new Date(startDate) : startDate;
  const start = dayOnly(startRaw);
  const today = dayOnly(now);
  const freq: AlphaFrequency =
    (frequency as AlphaFrequency | null | undefined) || "weekly";

  if (today <= start) {
    return { date: start, isFirst: true, isPast: false };
  }
  if (freq === "one_off") {
    return { date: start, isFirst: true, isPast: true };
  }
  if (freq === "monthly") {
    const next = new Date(start);
    while (next < today) next.setMonth(next.getMonth() + 1);
    return { date: next, isFirst: false, isPast: false };
  }
  const intervalDays =
    freq === "fortnightly"
      ? 14
      : freq === "custom"
      ? Math.max(1, customIntervalDays || 7)
      : 7;
  const dayMs = 86_400_000;
  const elapsed = Math.floor((today.getTime() - start.getTime()) / dayMs);
  const cycles = Math.ceil(elapsed / intervalDays);
  const next = new Date(start.getTime() + cycles * intervalDays * dayMs);
  return { date: next, isFirst: false, isPast: false };
}

export const FREQUENCY_LABEL: Record<AlphaFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  custom: "Custom",
  one_off: "One-off",
};
