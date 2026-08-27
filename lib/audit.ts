// The vocabulary of the audit log — shared by the recorder (lib/audit.server.ts),
// the API routes, the /admin/audit page and the weekly report.
//
// Nothing in here touches the database or `next/headers`, so it is safe to
// import from a client component. The server half lives in audit.server.ts.
//
// Two ideas hold the whole thing together:
//
//   • Every entry is a *sentence* first. `summary` ("Added the product 'Faith
//     Hoodie' to the store") is what the search box matches and what the AI
//     reads, so it is written for a person. Everything else — section, entity,
//     the field-level diff — is structure hung off that sentence for filtering
//     and for the detail view.
//   • Sections and actions are closed sets, so the filters can be chips with
//     counts rather than a free-text box, and so a typo can't invent a section
//     that nothing will ever match.

import { ROLE_LABELS } from "@/lib/adminRoles";

/* ── Actor headers ─────────────────────────────────────────────────────────── */

/**
 * middleware.ts has already resolved who is signed in and what roles they hold
 * before any `/api/admin` handler runs. It forwards that on the *request*
 * headers so recordAudit() can name the actor without a second round trip to
 * Supabase Auth on every single write.
 *
 * Middleware always `set`s these (never appends), so a value a client tried to
 * send is overwritten before a handler ever sees it. They are only trusted by
 * recordAudit when the call site doesn't name an actor itself.
 *
 * Declared here, in the client-safe half, because middleware runs on the edge
 * runtime and can't import the server-only recorder.
 */
export const AUDIT_ACTOR_HEADERS = {
  id: "x-dc-actor-id",
  email: "x-dc-actor-email",
  roles: "x-dc-actor-roles",
  path: "x-dc-path",
  method: "x-dc-method",
} as const;

/* ── Actions ───────────────────────────────────────────────────────────────── */

export const AUDIT_ACTIONS = {
  create: { label: "Added", icon: "add_circle", tone: "green" },
  update: { label: "Changed", icon: "edit", tone: "blue" },
  delete: { label: "Deleted", icon: "delete", tone: "red" },
  upload: { label: "Uploaded", icon: "upload", tone: "purple" },
  approve: { label: "Approved", icon: "check_circle", tone: "green" },
  reject: { label: "Declined", icon: "cancel", tone: "red" },
  moderate: { label: "Moderated", icon: "gavel", tone: "orange" },
  revalidate: { label: "Cache", icon: "refresh", tone: "grey" },
  login: { label: "Signed in", icon: "login", tone: "grey" },
  logout: { label: "Signed out", icon: "logout", tone: "grey" },
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const AUDIT_ACTION_KEYS = Object.keys(AUDIT_ACTIONS) as AuditAction[];

/* ── Sections ──────────────────────────────────────────────────────────────── */

/**
 * The admin areas, matching the sidebar groups in lib/adminNav.ts. Kept as its
 * own list rather than derived from ADMIN_GROUPS because the log has to keep
 * describing entries from a section that has since been renamed or removed.
 */
export const AUDIT_SECTIONS = {
  posts: { label: "Posts", icon: "article" },
  training: { label: "Training", icon: "school" },
  live: { label: "Live", icon: "smart_display" },
  announcements: { label: "Announcements", icon: "campaign" },
  courses: { label: "Courses", icon: "event" },
  store: { label: "Store", icon: "storefront" },
  site: { label: "Site", icon: "settings" },
  hr: { label: "HR", icon: "badge" },
  users: { label: "Users & access", icon: "group" },
  account: { label: "Account", icon: "key" },
} as const;

export type AuditSection = keyof typeof AUDIT_SECTIONS;

export const AUDIT_SECTION_KEYS = Object.keys(AUDIT_SECTIONS) as AuditSection[];

export function sectionLabel(section: string): string {
  return AUDIT_SECTIONS[section as AuditSection]?.label ?? section;
}

export function actionLabel(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction]?.label ?? action;
}

export function actionTone(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction]?.tone ?? "grey";
}

export function actionIcon(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction]?.icon ?? "bolt";
}

export function sectionIcon(section: string): string {
  return AUDIT_SECTIONS[section as AuditSection]?.icon ?? "bolt";
}

/* ── The entry ─────────────────────────────────────────────────────────────── */

/** One field that moved, as stored in `audit_log.changes`. */
export interface AuditFieldChange {
  from: unknown;
  to: unknown;
}

export type AuditChanges = Record<string, AuditFieldChange>;

/** A row of `audit_log`, exactly as the API returns it. */
export interface AuditEntry {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_roles: string[];
  action: AuditAction | string;
  section: AuditSection | string;
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  summary: string;
  changes: AuditChanges | null;
  metadata: Record<string, unknown> | null;
  method: string | null;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
}

/* ── Redaction and truncation ──────────────────────────────────────────────── */

/**
 * Field names whose values never reach the log, whatever they contain. Matched
 * case-insensitively as a substring, so `password`, `new_password` and
 * `passwordConfirm` are all caught by one entry.
 *
 * This is the difference between an audit log and a leak: an admin creating a
 * user posts a temporary password, and "who created this login" must be
 * recordable without the password being readable forever by whoever can open
 * the log afterwards.
 */
const REDACTED_KEYS = [
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "session",
  "signature",
];

/** Longest value kept verbatim. Post bodies and block JSON blow past this. */
export const MAX_VALUE_CHARS = 1200;

export const REDACTED = "[redacted]";

function isRedactedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return REDACTED_KEYS.some((needle) => lower.includes(needle));
}

/**
 * Make a value safe and small enough to store: secrets stripped, long strings
 * clipped with a note saying how much was dropped, deep objects flattened to a
 * summary rather than serialised whole.
 */
export function sanitiseValue(key: string, value: unknown, depth = 0): unknown {
  if (isRedactedKey(key)) return REDACTED;
  if (value === null || value === undefined) return value ?? null;

  if (typeof value === "string") {
    if (value.length <= MAX_VALUE_CHARS) return value;
    return `${value.slice(0, MAX_VALUE_CHARS)}… [+${value.length - MAX_VALUE_CHARS} more characters]`;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    // Arrays of anything substantial (a product's variants, a page's blocks)
    // are described rather than copied — the detail view wants "12 items", not
    // 40KB of JSON that nobody scrolls through.
    if (depth >= 1 && value.length > 8) return `[${value.length} items]`;
    return value.slice(0, 20).map((v, i) => sanitiseValue(String(i), v, depth + 1));
  }

  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitiseValue(k, v, depth + 1);
    }
    return out;
  }

  return String(value);
}

/* ── Diffing ───────────────────────────────────────────────────────────────── */

/** Fields that change on every write and say nothing about intent. */
const NOISE_FIELDS = new Set(["updated_at", "created_at", "id"]);

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  // A form posts "12" where the row holds 12; that isn't a change worth a row
  // in the detail table.
  if (typeof a === "number" && typeof b === "string") return String(a) === b;
  if (typeof a === "string" && typeof b === "number") return a === String(b);
  return false;
}

/**
 * Which fields actually moved between two versions of a record.
 *
 * Only keys present in `after` are considered, so a PATCH that sends three
 * fields produces a three-field diff rather than a diff against every column
 * the caller happened not to send.
 */
export function diffRecords(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): AuditChanges | null {
  if (!after) return null;

  const changes: AuditChanges = {};
  for (const [key, next] of Object.entries(after)) {
    if (NOISE_FIELDS.has(key)) continue;
    const previous = before ? before[key] : undefined;
    if (before && sameValue(previous, next)) continue;
    changes[key] = {
      from: before ? sanitiseValue(key, previous ?? null) : null,
      to: sanitiseValue(key, next),
    };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/** The whole of a record, sanitised — used for creates and deletes. */
export function snapshotRecord(
  record: Record<string, unknown> | null | undefined,
): AuditChanges | null {
  if (!record) return null;
  const changes: AuditChanges = {};
  for (const [key, value] of Object.entries(record)) {
    if (NOISE_FIELDS.has(key)) continue;
    changes[key] = { from: null, to: sanitiseValue(key, value) };
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/* ── Presentation helpers ──────────────────────────────────────────────────── */

/**
 * Column names, said out loud.
 *
 * The log is written from database rows, so without this the screen fills up
 * with the schema — `is_published`, `base_price_pennies`, `cv_path`. None of
 * those are words, and the people reading this page are the ones least
 * interested in what we called the column. Anything unlisted falls through to
 * the generic rule below, which is fine for most columns; this map is for the
 * ones where it isn't.
 *
 * Kept separate from VALUE_LABELS below because the same word means different
 * things on each side: `body` is the column "Content", but "body" as a *value*
 * is just the word body and must be left alone.
 */
const FIELD_LABELS: Record<string, string> = {
  // The seven role columns of admin_roles are field names as well as values.
  ...ROLE_LABELS,
  id: "ID",
  url: "URL",
  cta_link: "Button link",
  cta_text: "Button text",
  target_url: "Points to",
  is_published: "Published",
  is_featured: "Featured",
  is_active: "Active",
  is_done: "Done",
  sort_order: "Order",
  base_price_pennies: "Price",
  price_pennies: "Price",
  total_pennies: "Total",
  subtotal_pennies: "Subtotal",
  min_read_seconds: "Minimum read time",
  password_hash: "Password",
  auth_user_id: "Linked login",
  staff_id: "Staff member",
  image_url: "Image",
  image_path: "Image file",
  embed_url: "Embed",
  slug: "Web address",
  body: "Content",
  cv_path: "CV",
  ip: "IP address",
  user_agent: "Browser",
};

/** Stored values whose tidied-up form still wouldn't be how anyone writes it. */
const VALUE_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  one_off: "One-off",
  one_to_one: "One-to-one",
  youth_alpha: "Youth Alpha",
  cap_money: "CAP Money",
  bible_course: "The Bible Course",
  in_person: "In person",
  full_time: "Full time",
  part_time: "Part time",
  hr: "HR",
  nfc: "NFC",
  cv: "CV",
};

/** The generic rule: `target_url` → "Target url", `startsAt` → "Starts at". */
function titleise(text: string): string {
  return text
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Turn a column name into something readable. */
export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? titleise(field);
}

/**
 * A stored value, said out loud: `youth_alpha` → "Youth Alpha", `one_off` →
 * "One-off", `super_admin` → "Super Admin".
 */
export function humanise(value: string): string {
  return VALUE_LABELS[value] ?? titleise(value);
}

/**
 * Whether a string is a bare identifier rather than content.
 *
 * Deliberately narrow — lowercase words joined by underscores and nothing else.
 * Emails have an `@`, URLs and paths have `/`, slugs use hyphens, and prose has
 * spaces, so none of them match and none of them get mangled by being tidied up.
 */
function looksLikeIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(value);
}

/** How a value reads in the detail table. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    // A known value name always wins; otherwise only tidy up things that are
    // plainly identifiers rather than content.
    if (VALUE_LABELS[value]) return VALUE_LABELS[value];
    return looksLikeIdentifier(value) ? titleise(value) : value;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    // Role lists and the like read as a sentence, not as JSON.
    return value.length === 0 ? "—" : value.map((v) => formatValue(v)).join(", ");
  }
  if (value && typeof value === "object") {
    // A small flat object — `{ added: 2, removed: 1 }` — reads better as
    // "Added: 2, Removed: 1" than as pretty-printed JSON. Anything deeper or
    // longer than that genuinely is data, and JSON is the honest way to show it.
    const entries = Object.entries(value as Record<string, unknown>);
    const flat =
      entries.length > 0 &&
      entries.length <= 6 &&
      entries.every(([, v]) => v === null || typeof v !== "object");
    if (flat) {
      return entries.map(([k, v]) => `${fieldLabel(k)}: ${formatValue(v)}`).join(", ");
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** "just now" / "14 minutes ago" / "3 days ago", then a plain date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Time zone ─────────────────────────────────────────────────────────────── */

/**
 * Every time this log shows is church time, wherever it is rendered.
 *
 * The rows are stored in UTC, Vercel's servers run in UTC, and the church is in
 * Stockton-on-Tees — which is UTC in winter and UTC+1 from late March to late
 * October. So a timestamp formatted without saying which zone it is in reads an
 * hour early for two thirds of the year, which is exactly wrong for a record
 * whose whole job is saying *when* something happened.
 *
 * Pinning it to the church's zone rather than the reader's is deliberate: a
 * Super Admin checking the log from abroad wants to know when it happened here,
 * and the AI's answer, the list, the detail panel and the weekly email must all
 * say the same time as each other.
 */
export const SITE_TIME_ZONE = "Europe/London";

/**
 * How far the site's zone is ahead of UTC at a given instant, in milliseconds.
 *
 * Derived from `Intl` rather than hard-coded, so the BST/GMT switch happens on
 * the right Sunday every year without anyone remembering to change anything.
 */
function zoneOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // `hour` comes back as 24 at midnight under hour12:false in some engines.
  const hour = get("hour") % 24;

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** Full timestamp for the detail view — church time, to the second, zone named. */
export function fullTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    timeZone: SITE_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // "GMT+1" rather than nothing: the one place in the admin that has to be
    // unambiguous about which clock it means.
    timeZoneName: "short",
  });
}

/**
 * "Thu 27 Aug 2026, 10:07am" — church time, already formatted.
 *
 * Used everywhere a time leaves the browser: the rows handed to the AI, the
 * weekly report, the email. Formatting before the model sees it is the whole
 * fix for the model quoting UTC as though it were local — it can't get the
 * conversion wrong if it is never asked to do one.
 */
export function siteDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date
    .toLocaleString("en-GB", {
      timeZone: SITE_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s?([ap])m$/i, (_, m: string) => `${m.toLowerCase()}m`);
}

/** "27 Aug 2026" in church time. */
export function siteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    timeZone: SITE_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today's date in church time, as `YYYY-MM-DD`. */
export function siteDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * The instants a `YYYY-MM-DD` starts and ends *here*.
 *
 * Without this, filtering "today" would compare against UTC midnight, which
 * through the summer means the last hour of yesterday evening counts as today
 * — an off-by-an-hour that only shows up in the entries most likely to be
 * looked up (the recent ones).
 */
export function siteDayBounds(day: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const guess = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(guess.getTime())) return null;

  // Midnight local = midnight UTC minus the offset. The offset is measured at
  // the guess rather than assumed, and BST switches at 01:00 local, so midnight
  // is never inside the ambiguous hour.
  const start = new Date(guess.getTime() - zoneOffsetMs(guess));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** The bit of an email before the @ — how a person is named in a busy list. */
export function actorName(email: string | null | undefined): string {
  if (!email) return "System";
  return email.split("@")[0] || email;
}

/* ── Time ranges (shared by the page, the API and the AI tools) ────────────── */

export const AUDIT_RANGES = {
  today: { label: "Today", days: 1 },
  week: { label: "7 days", days: 7 },
  month: { label: "30 days", days: 30 },
  quarter: { label: "90 days", days: 90 },
  all: { label: "All time", days: 0 },
} as const;

export type AuditRange = keyof typeof AUDIT_RANGES;

export function rangeStart(range: string, now: Date = new Date()): string | null {
  const spec = AUDIT_RANGES[range as AuditRange];
  if (!spec || spec.days === 0) return null;
  const start = new Date(now);
  start.setDate(start.getDate() - spec.days);
  return start.toISOString();
}
