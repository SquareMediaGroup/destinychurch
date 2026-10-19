// What the page shows: two services, each with the parts members actually
// notice. Every probe runs once per refresh and is shared by the components
// that depend on it.

import {
  probeProvider,
  probeSite,
  probeSiteHealth,
  probeSupabaseAuth,
  type Level,
  type ProbeResult,
} from "./checks";
import { getNotices, type Notice, type Notices } from "./notices";

export interface ComponentStatus {
  id: string;
  name: string;
  description: string;
  level: Level;
  detail: string | null;
}

export interface ServiceStatus {
  id: string;
  name: string;
  level: Level;
  components: ComponentStatus[];
}

export interface StatusReport {
  level: Level;
  checkedAt: string;
  services: ServiceStatus[];
  notices: Notices;
}

const RANK: Record<Level, number> = { operational: 0, unknown: 1, degraded: 2, down: 3 };

/** The worst of several results. "Unknown" only wins when nothing was known. */
function worst(...results: ProbeResult[]): ProbeResult {
  const known = results.filter((r) => r.level !== "unknown");
  if (known.length === 0) return results[0] ?? { level: "unknown", detail: null, ms: null };
  return known.reduce((a, b) => (RANK[b.level] > RANK[a.level] ? b : a));
}

function worstLevel(levels: Level[]): Level {
  const known = levels.filter((l) => l !== "unknown");
  if (known.length === 0) return "unknown";
  return known.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

/** Every part shown on the page. Ids are used by notices and reports. */
export const componentCatalog = [
  { id: "pages", service: "Destiny Church website", name: "Website pages", description: "The website and its pages" },
  { id: "sermons", service: "Destiny Church website", name: "Sermons", description: "Watching and listening to sermons" },
  { id: "events", service: "Destiny Church website", name: "Events and What's On", description: "Event listings and sign-ups" },
  { id: "shop", service: "Destiny Church website", name: "Shop and checkout", description: "Shop orders and payments" },
  { id: "giving", service: "Destiny Church website", name: "Giving", description: "Online giving" },
  { id: "search", service: "Destiny Church website", name: "AI search", description: "Smart Search on the website" },
  { id: "admin", service: "Destiny Church website", name: "Admin and staff portal", description: "Sign-in for staff and volunteers" },
  { id: "d1-signin", service: "Destiny One", name: "Sign-in", description: "Email codes and passwords" },
  { id: "d1-chats", service: "Destiny One", name: "Chats and messages", description: "Loading and sending messages" },
  { id: "d1-realtime", service: "Destiny One", name: "Live updates", description: "New messages arriving instantly" },
  { id: "d1-media", service: "Destiny One", name: "Photos and voice notes", description: "Uploading and viewing attachments" },
  { id: "d1-push", service: "Destiny One", name: "Notifications", description: "Push notifications to your phone" },
  { id: "d1-admin", service: "Destiny One", name: "D1 Admin", description: "The desktop app for admins and leaders" },
] as const;

type ComponentId = (typeof componentCatalog)[number]["id"];

function component(id: ComponentId, result: ProbeResult): ComponentStatus {
  const { name, description } = componentCatalog.find((c) => c.id === id)!;
  return { id, name, description, level: result.level, detail: result.detail };
}

export async function getStatus(): Promise<StatusReport> {
  const [home, sermons, whatsOn, shop, give, login, health, d1Config, auth, supabase, expo, notices] =
    await Promise.all([
      probeSite("/"),
      probeSite("/sermons"),
      probeSite("/whats-on"),
      probeSite("/shop"),
      probeSite("/give"),
      probeSite("/login"),
      probeSiteHealth(),
      probeSite("/api/app/v1/one/config"),
      probeSupabaseAuth(),
      probeProvider("supabase"),
      probeProvider("expo"),
      getNotices(),
    ]);

  const website: ComponentStatus[] = [
    component("pages", home),
    component("sermons", sermons),
    component("events", worst(whatsOn, health.database)),
    component("shop", worst(shop, health.database)),
    component("giving", give),
    component("search", worst(health.reachable, health.smartSearch)),
    component("admin", worst(login, health.database)),
  ];

  // Destiny One talks to the website's /api/app/v1/one routes and to Supabase
  // directly (sign-in, realtime, media), so it depends on both.
  const d1Server = worst(d1Config, health.database);
  const d1: ComponentStatus[] = [
    component("d1-signin", worst(auth, supabase.component("Auth"))),
    component("d1-chats", d1Server),
    component("d1-realtime", worst(d1Server, supabase.component("Realtime"))),
    component("d1-media", worst(d1Server, supabase.component("Storage"))),
    component("d1-push", worst(d1Config, expo.overall)),
    component("d1-admin", worst(d1Server, auth)),
  ];

  applyNotices([...website, ...d1], notices.active);

  const services: ServiceStatus[] = [
    { id: "website", name: "Destiny Church website", level: worstLevel(website.map((c) => c.level)), components: website },
    { id: "destiny-one", name: "Destiny One", level: worstLevel(d1.map((c) => c.level)), components: d1 },
  ];

  return {
    level: worstLevel(services.map((s) => s.level)),
    checkedAt: new Date().toISOString(),
    services,
    notices,
  };
}

const NOTICE_LEVEL: Record<Notice["kind"], Level> = { outage: "down", degraded: "degraded", maintenance: "degraded" };

/**
 * A notice that has started raises its components to at least its level, so a
 * problem we know about shows even when the automated probes pass (or can't
 * see it).
 */
function applyNotices(components: ComponentStatus[], active: Notice[], now = Date.now()) {
  for (const notice of active) {
    if (new Date(notice.startedAt).getTime() > now) continue;
    const level = NOTICE_LEVEL[notice.kind];
    for (const c of components) {
      if (notice.components.includes(c.id) && RANK[level] > RANK[c.level]) {
        c.level = level;
        c.detail = notice.title;
      }
    }
  }
}
