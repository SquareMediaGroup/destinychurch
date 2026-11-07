// The church's standing weekly gatherings — what the site shows in place of
// the calendar feed when the feed can't be reached. Times come from
// lib/churchInfo.ts where it has them, so a schedule change there carries
// through to this fallback too.

import { ADDRESS, SCHEDULE } from "@/lib/churchInfo";

export type WeeklyGathering = {
  name: string;
  /** Three-letter day shown large on the card. */
  day: string;
  when: string;
  where: string;
  href: string;
};

export const WEEKLY_GATHERINGS: WeeklyGathering[] = [
  {
    name: "Sunday Service",
    day: "SUN",
    when: `Sundays ${SCHEDULE.mainServiceStart} – ${SCHEDULE.mainServiceEnd}`,
    where: ADDRESS.venue,
    href: "/visit",
  },
  {
    name: "Prayer Service",
    day: "SUN",
    when: `Sundays ${SCHEDULE.prayerServiceStart} – ${SCHEDULE.prayerServiceEnd}`,
    where: ADDRESS.venue,
    href: "/visit",
  },
  {
    name: "Destiny Kids",
    day: "SUN",
    when: `Sundays from ${SCHEDULE.kidsCheckIn}, ages 0–11`,
    where: ADDRESS.venue,
    href: "/kids",
  },
  {
    name: "Destiny Youth",
    day: "WED",
    when: "Wednesdays 7pm – 8:30pm, ages 11–18",
    where: ADDRESS.venue,
    href: "/youth",
  },
  {
    name: "Connect Groups",
    day: "MIDWEEK",
    when: "Midweek, throughout the week",
    where: "Various locations",
    href: "/connect",
  },
];
