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
import { activeNotices, type Notice } from "./notices";

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

function component(id: string, name: string, description: string, result: ProbeResult): ComponentStatus {
  return { id, name, description, level: result.level, detail: result.detail };
}

export async function getStatus(): Promise<StatusReport> {
  const [home, sermons, whatsOn, shop, give, login, health, d1Config, auth, supabase, expo] =
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
    ]);

  const website: ComponentStatus[] = [
    component("pages", "Website pages", "destinytees.uk and its pages", home),
    component("sermons", "Sermons", "Watching and listening to sermons", sermons),
    component("events", "Events and What's On", "Event listings and sign-ups", worst(whatsOn, health.database)),
    component("shop", "Shop and checkout", "Destiny Tees shop and Stripe payments", worst(shop, health.database)),
    component("giving", "Giving", "Online giving", give),
    component("search", "AI search", "Smart Search on the website", worst(health.reachable, health.smartSearch)),
    component("admin", "Admin and staff portal", "Sign-in for staff and volunteers", worst(login, health.database)),
  ];

  // Destiny One talks to the website's /api/app/v1/one routes and to Supabase
  // directly (sign-in, realtime, media), so it depends on both.
  const d1Server = worst(d1Config, health.database);
  const d1: ComponentStatus[] = [
    component("d1-signin", "Sign-in", "Email codes and passwords", worst(auth, supabase.component("Auth"))),
    component("d1-chats", "Chats and messages", "Loading and sending messages", d1Server),
    component("d1-realtime", "Live updates", "New messages arriving instantly", worst(d1Server, supabase.component("Realtime"))),
    component("d1-media", "Photos and voice notes", "Uploading and viewing attachments", worst(d1Server, supabase.component("Storage"))),
    component("d1-push", "Notifications", "Push notifications to your phone", worst(d1Config, expo.overall)),
    component("d1-admin", "D1 Admin", "The desktop app for admins and leaders", worst(d1Server, auth)),
  ];

  applyNotices([...website, ...d1], activeNotices());

  const services: ServiceStatus[] = [
    { id: "website", name: "Destiny Church website", level: worstLevel(website.map((c) => c.level)), components: website },
    { id: "destiny-one", name: "Destiny One", level: worstLevel(d1.map((c) => c.level)), components: d1 },
  ];

  return {
    level: worstLevel(services.map((s) => s.level)),
    checkedAt: new Date().toISOString(),
    services,
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
