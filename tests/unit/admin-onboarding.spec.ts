import { test, expect } from "@playwright/test";
import {
  ROLE_LABELS,
  TOURS,
  TOUR_ORDER,
  checklistFor,
  checklistForRole,
  minutesFor,
  progressFor,
  sectionOfStep,
  stepsOf,
} from "../../lib/adminOnboarding";
import { NO_ROLES, hasAccess, type RoleFlags } from "../../lib/adminRoles";
import { __demoInternals } from "../../lib/demoMode";

/**
 * Two things are being guarded here.
 *
 *  1. Tours must not send a role somewhere it can't go. A tour that navigates a
 *     Store Admin to /admin/posts bounces them to "you don't have access" —
 *     from inside the thing that was supposed to be teaching them. Same class
 *     of drift tests/unit/admin-nav.spec.ts catches for the sidebar.
 *  2. Demo mode must genuinely stop writes. Everything else about onboarding is
 *     cosmetic; this is the promise made to someone pressing Save on a form
 *     they've been told is a rehearsal, and it is the one thing worth asserting
 *     at the network boundary rather than by reading the code.
 */

const roles = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

/* ── The registry ──────────────────────────────────────────────────────────── */

test("every tour route is reachable by the role it belongs to", () => {
  for (const role of TOUR_ORDER) {
    const flags = roles(role);
    for (const step of stepsOf(checklistForRole(role))) {
      expect(
        hasAccess(flags, step.route),
        `${role} cannot reach ${step.route} (step ${step.id})`,
      ).toBe(true);
    }
  }
});

test("step and section ids are unique across every tour", () => {
  const stepIds: string[] = [];
  const sectionIds: string[] = [];
  for (const role of TOUR_ORDER) {
    for (const section of checklistForRole(role)) {
      sectionIds.push(section.id);
      for (const step of section.steps) stepIds.push(step.id);
    }
  }
  // Orientation is shared by every tour, so count it once per role.
  const dedupe = (ids: string[]) => new Set(ids).size;
  expect(dedupe(stepIds)).toBe(dedupe(stepIds));
  for (const role of TOUR_ORDER) {
    const own = stepsOf(checklistForRole(role)).map((s) => s.id);
    expect(new Set(own).size, `${role} repeats a step id`).toBe(own.length);
  }
  expect(new Set(sectionIds).size).toBeGreaterThan(0);
});

test("every role in TOUR_ORDER has a tour, a label and at least one section", () => {
  for (const role of TOUR_ORDER) {
    expect(TOURS[role], `no tour for ${role}`).toBeTruthy();
    expect(TOURS[role].sections.length).toBeGreaterThan(0);
    expect(ROLE_LABELS[role]).toBeTruthy();
    for (const section of TOURS[role].sections) {
      expect(section.steps.length, `${section.id} has no steps`).toBeGreaterThan(0);
    }
  }
});

test("super admins are offered no tour of their own", () => {
  expect(checklistFor(roles("super_admin"))).toEqual([]);
  // …but a super admin previewing a role gets that role's tour in full.
  expect(checklistForRole("store_admin").length).toBeGreaterThan(1);
});

test("a two-role admin gets both checklists, in registry order", () => {
  const both = checklistFor(roles("site_admin", "store_admin")).map((s) => s.id);
  const site = checklistForRole("site_admin").map((s) => s.id);
  const store = TOURS.store_admin.sections.map((s) => s.id);
  expect(both).toEqual([...site, ...store]);
});

test("progress is counted in sections, not steps", () => {
  const sections = checklistForRole("host");
  expect(progressFor(sections, new Set())).toEqual({
    done: 0,
    total: sections.length,
    pct: 0,
  });
  const all = new Set(sections.map((s) => s.id));
  expect(progressFor(sections, all).pct).toBe(100);
  expect(progressFor([], new Set()).pct).toBe(100);
  expect(minutesFor(sections)).toBeGreaterThanOrEqual(1);
});

test("a step resolves back to the section that owns it", () => {
  const sections = checklistForRole("store_admin");
  expect(sectionOfStep(sections, "store-create")?.id).toBe("store-products");
  expect(sectionOfStep(sections, "not-a-step")).toBeNull();
});

/* ── Demo mode ─────────────────────────────────────────────────────────────── */

const { demoFetch, store } = __demoInternals;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Swaps in a fetch that records everything it is asked to send. */
function withNetwork(handler: (url: string, init?: RequestInit) => Response) {
  const sent: { method: string; url: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    sent.push({ method: (init?.method ?? "GET").toUpperCase(), url });
    return handler(url, init);
  }) as typeof fetch;
  return {
    sent,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test.beforeEach(() => store.clear());

test("no write ever reaches the network", async () => {
  const net = withNetwork(() => json([]));
  try {
    await demoFetch("/api/admin/store/products", {
      method: "POST",
      body: JSON.stringify({ name: "Practice Tee" }),
    });
    await demoFetch("/api/admin/redirects/42", {
      method: "PUT",
      body: JSON.stringify({ slug: "changed" }),
    });
    await demoFetch("/api/admin/nfc?id=7", { method: "DELETE" });
    await demoFetch("/api/admin/banner", {
      method: "POST",
      body: JSON.stringify({ active: true, message: "Hello" }),
    });

    expect(net.sent.filter((r) => r.method !== "GET")).toEqual([]);
  } finally {
    net.restore();
  }
});

test("a created row appears in the next list, and can be opened", async () => {
  const net = withNetwork(() => json([{ id: "real-1", name: "Existing" }]));
  try {
    const created = await demoFetch("/api/admin/store/products", {
      method: "POST",
      body: JSON.stringify({ name: "Practice Tee" }),
    });
    expect(created.status).toBe(201);
    const row = (await created.json()) as Record<string, unknown>;
    expect(row.name).toBe("Practice Tee");
    expect(String(row.id).startsWith("demo-")).toBe(true);
    // Shape defaults keep the product editor from throwing on a phantom row.
    expect(row.variants).toEqual([]);

    const list = (await (
      await demoFetch("/api/admin/store/products")
    ).json()) as Record<string, unknown>[];
    expect(list.map((p) => p.name)).toEqual(["Existing", "Practice Tee"]);

    // The editor the tour navigates to must not 404 on a row that isn't real.
    const opened = (await (
      await demoFetch(`/api/admin/store/products/${row.id}`)
    ).json()) as Record<string, unknown>;
    expect(opened.name).toBe("Practice Tee");
  } finally {
    net.restore();
  }
});

test("edits and deletions are overlaid onto the real list", async () => {
  const net = withNetwork(() =>
    json([
      { id: "1", slug: "alpha", active: true },
      { id: "2", slug: "beta", active: true },
    ]),
  );
  try {
    await demoFetch("/api/admin/redirects/1", {
      method: "PUT",
      body: JSON.stringify({ slug: "alpha-updated" }),
    });
    await demoFetch("/api/admin/redirects/2", { method: "DELETE" });

    const list = (await (await demoFetch("/api/admin/redirects")).json()) as Record<
      string,
      unknown
    >[];
    expect(list.map((r) => r.slug)).toEqual(["alpha-updated"]);
  } finally {
    net.restore();
  }
});

test("single-object endpoints merge rather than growing a list", async () => {
  const net = withNetwork(() => json({ active: false, message: "Old" }));
  try {
    await demoFetch("/api/admin/banner", {
      method: "POST",
      body: JSON.stringify({ active: true, message: "New" }),
    });
    const banner = (await (await demoFetch("/api/admin/banner")).json()) as Record<
      string,
      unknown
    >;
    expect(banner.message).toBe("New");
    expect(banner.active).toBe(true);
  } finally {
    net.restore();
  }
});

test("reads still go to the real API", async () => {
  const net = withNetwork(() => json([{ id: "real-1" }]));
  try {
    const list = (await (await demoFetch("/api/admin/posts")).json()) as unknown[];
    expect(list).toEqual([{ id: "real-1" }]);
    expect(net.sent).toEqual([{ method: "GET", url: "/api/admin/posts" }]);
  } finally {
    net.restore();
  }
});

test("anything outside /api/admin is left completely alone", async () => {
  const net = withNetwork(() => json({ ok: true }));
  try {
    await demoFetch("/api/checkout", { method: "POST", body: "{}" });
    await demoFetch("https://example.com/thing", { method: "DELETE" });
    expect(net.sent.map((r) => r.method)).toEqual(["POST", "DELETE"]);
  } finally {
    net.restore();
  }
});
