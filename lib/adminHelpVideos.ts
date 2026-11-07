// The admin help video series, shown at /admin/help.
//
// Onboarding is moving to video: each access level gets a how-to video on
// YouTube, and a new admin watches theirs, then practises in the tour's demo
// mode (lib/demoMode.ts), where nothing is saved. This list is the series.
//
// The videos themselves live on YouTube, not in this repository (they're made in
// apps/campaign-videos and handed over as files). To publish one: upload it, then
// set its `youtubeId` (the 11 characters after `v=`). Until then its card shows
// the poster, if it has one, and "Coming soon".

import type { AdminRole } from "@/lib/adminRoles";

export interface AdminHelpVideo {
  id: string;
  title: string;
  description: string;
  /** Who it's for. null = every admin. Super Admins see every video. */
  role: AdminRole | null;
  youtubeId?: string;
  /** A still from the video (public/img/admin-help), shown before it plays. */
  poster?: string;
  /** Length, shown on the card ("1:45"). */
  length?: string;
}

/** The whole series on YouTube ("Tutorials | Destiny Admin"). */
export const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLIubvuhfWydo";

export const WELCOME_VIDEO: AdminHelpVideo = {
  id: "welcome",
  youtubeId: "XDNVdqo2r8E",
  title: "Welcome to Destiny Admin",
  description: "What the admin is, what each role looks after, and where to come back to when you get stuck.",
  role: null,
  poster: "/img/admin-help/welcome-poster.webp",
  length: "1:21",
};

/** One video per access level, in sidebar order. Each plays once its youtubeId is set. */
export const ROLE_VIDEOS: AdminHelpVideo[] = [
  {
    id: "destiny-one",
    title: "Destiny One Admin: looking after the members' app",
    description:
      "Approving access requests, invites, app members and leader roles, communities and groups and the 3-people, 2-adults rule, feedback and app settings.",
    role: "destiny_one_admin",
    poster: "/img/admin-help/destiny-one-poster.webp",
    length: "4:53",
  },
  {
    id: "safeguarding",
    title: "Safeguarding Admin: keeping Destiny One safe",
    description:
      "The queue, reported messages, reviewing a conversation (recorded in the audit log), removing a message, pausing a group and blocks.",
    poster: "/img/admin-help/safeguarding-poster.webp",
    length: "3:10",
    role: "safeguarding_admin",
  },
  {
    id: "events",
    youtubeId: "eTaY2pgeTAo",
    title: "Event Admin: courses, events and announcements",
    description:
      "Course dates and banners, the site popup, the featured event, NFC tiles, links pages, song requests, talent show voting and DestinyAI.",
    role: "event_admin",
    poster: "/img/admin-help/events-poster.webp",
    length: "8:46",
  },
  {
    id: "training",
    youtubeId: "xQW7y4kxZoo",
    title: "Training Admin: training for every team",
    description:
      "Categories, sub-groups and passwords, folders, writing and publishing posts, and what the team sees.",
    role: "training_admin",
    poster: "/img/admin-help/training-poster.webp",
    length: "3:08",
  },
  {
    id: "store",
    youtubeId: "dH5233CZYj4",
    title: "Store Admin: running the shop",
    description:
      "Adding products, photos, sizes and stock, publishing, orders from paid to collected, and the shop's hero slides.",
    role: "store_admin",
    poster: "/img/admin-help/shop-poster.webp",
    length: "7:25",
  },
  {
    id: "sermons",
    title: "Sermon Admin: sermons on the podcast",
    description: "Publishing sermon audio to the podcast, linking it to YouTube, series and speakers.",
    role: "sermon_admin",
    poster: "/img/admin-help/sermons-poster.webp",
    length: "1:36",
  },
  {
    id: "design",
    title: "Design Admin: from request to finished design",
    description: "Reading the brief, claiming a ticket, delivering files and video links, and notes.",
    role: "design_admin",
    poster: "/img/admin-help/design-poster.webp",
    length: "2:05",
  },
  {
    id: "hr",
    title: "HR Admin: looking after the team",
    description:
      "The staff directory and portal logins, approving leave, reviews, documents, joining and leaving checklists, jobs and applications.",
    role: "hr_admin",
    poster: "/img/admin-help/hr-poster.webp",
    length: "4:15",
  },
  {
    id: "site",
    title: "Site Admin: pages, links and the status page",
    description:
      "Writing, scheduling and publishing pages, history and the Bin, short links and QR codes, the status page and analytics.",
    role: "site_admin",
    poster: "/img/admin-help/site-poster.webp",
    length: "5:49",
  },
  {
    id: "super",
    title: "Super Admin: running the whole admin",
    description:
      "Adding admins and choosing their roles, two-factor resets, the audit log, the sitewide banner, clearing the cache and previewing other roles.",
    role: "super_admin",
    poster: "/img/admin-help/super-poster.webp",
    length: "3:20",
  },
];

/** Whether a video has anything to play yet. */
export function isPublished(video: AdminHelpVideo): boolean {
  return Boolean(video.youtubeId);
}
