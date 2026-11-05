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

export const WELCOME_VIDEO: AdminHelpVideo = {
  id: "welcome",
  title: "Welcome to Destiny Admin",
  description: "What the admin is, what each role looks after, and where to come back to when you get stuck.",
  role: null,
  poster: "/img/admin-help/welcome-poster.webp",
  length: "1:21",
};

/** One video per access level, in sidebar order. Not filmed yet. */
export const ROLE_VIDEOS: AdminHelpVideo[] = [
  {
    id: "destiny-one",
    title: "Destiny One Admin",
    description: "Access requests, invites, app members and communities.",
    role: "destiny_one_admin",
  },
  {
    id: "safeguarding",
    title: "Safeguarding Admin",
    description: "Reports, paused groups and reviewing a conversation.",
    role: "safeguarding_admin",
  },
  {
    id: "events",
    title: "Event Admin: courses, events and announcements",
    description:
      "Course dates and banners, the site popup, the featured event, NFC tiles, links pages, song requests, talent show voting and DestinyAI.",
    role: "event_admin",
    poster: "/img/admin-help/events-poster.webp",
    length: "8:46",
  },
  {
    id: "training",
    title: "Training Admin: training for every team",
    description:
      "Categories, sub-groups and passwords, folders, writing and publishing posts, and what the team sees.",
    role: "training_admin",
    poster: "/img/admin-help/training-poster.webp",
    length: "3:08",
  },
  {
    id: "store",
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
    title: "Super Admin",
    description: "Adding admins, choosing their roles, and the audit log.",
    role: "super_admin",
  },
];

/** Whether a video has anything to play yet. */
export function isPublished(video: AdminHelpVideo): boolean {
  return Boolean(video.youtubeId);
}
