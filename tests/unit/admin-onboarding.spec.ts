import { test, expect } from "@playwright/test";
import {
  ONBOARDED_ROLES,
  ROLE_ICONS,
  STAGES,
  TASKS,
  heldRoles,
  progressFor,
  stageFromParam,
} from "../../lib/adminOnboarding";
import { ROLE_VIDEOS, WELCOME_VIDEO, videosFor } from "../../lib/adminHelpVideos";
import { NO_ROLES, roleLabel, type RoleFlags } from "../../lib/adminRoles";
import { __demoInternals } from "../../lib/demoMode";

/**
 * Two things are being guarded here.
 *
 *  1. The onboarding registry: four stages, a video for every role a person can
 *     hold, and progress counted in the launcher's three tasks.
 *  2. Demo mode must genuinely stop writes. Everything else about onboarding is
 *     cosmetic; this is the promise made to someone pressing Save in the
 *     sandbox, and it is the one thing worth asserting at the network boundary
 *     rather than by reading the code.
 */

const roles = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

/* ── The registry ──────────────────────────────────────────────────────────── */

test("onboarding is welcome, videos, sandbox, finish - in that order", () => {
  expect(STAGES.map((s) => s.id)).toEqual(["welcome", "videos", "sandbox", "finish"]);
  // The launcher counts everything after the welcome.
  expect(TASKS.map((t) => t.id)).toEqual(["videos", "sandbox", "finish"]);
});

test("every stage is reachable from the URL, and nothing else is", () => {
  for (const { id } of STAGES) expect(stageFromParam(id)).toBe(id);
  expect(stageFromParam("tour")).toBeNull();
  expect(stageFromParam(null)).toBeNull();
});

test("every role a person can hold has a video, a label and an icon", () => {
  for (const role of ONBOARDED_ROLES) {
    expect(ROLE_VIDEOS.some((v) => v.role === role), `no video for ${role}`).toBe(true);
    expect(roleLabel(role)).not.toBe(role);
    expect(ROLE_ICONS[role], `no icon for ${role}`).toBeTruthy();
  }
  expect(ONBOARDED_ROLES).not.toContain("super_admin");
});

test("video ids are unique", () => {
  const ids = [WELCOME_VIDEO, ...ROLE_VIDEOS].map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("people are shown the videos for the roles they hold", () => {
  expect(videosFor(NO_ROLES)).toEqual([]);
  expect(videosFor(roles("store_admin", "site_admin")).map((v) => v.role)).toEqual([
    "store_admin",
    "site_admin",
  ]);
  // Super admins hold everything, so they are shown everything.
  expect(videosFor(roles("super_admin"))).toEqual(ROLE_VIDEOS);
});

test("heldRoles lists what someone holds, never super_admin", () => {
  expect(heldRoles(roles("hr_admin", "store_admin"))).toEqual(["store_admin", "hr_admin"]);
  expect(heldRoles(roles("super_admin"))).toEqual([]);
});

test("progress is counted in launcher tasks", () => {
  expect(progressFor(new Set())).toEqual({ done: 0, total: 3, pct: 0 });
  expect(progressFor(new Set(["videos"])).done).toBe(1);
  expect(progressFor(new Set(["videos", "sandbox", "finish"])).pct).toBe(100);
  // Ids left behind by the retired tour are ignored.
  expect(progressFor(new Set(["store-products", "orientation"])).done).toBe(0);
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

    // The editor opened after "create" must not 404 on a row that isn't real.
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
