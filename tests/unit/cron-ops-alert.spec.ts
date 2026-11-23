import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { cronFailurePayload, logCronFailure } from "../../lib/cronOpsLog";

const CRON_ROUTES = [
  "analytics-anonymise",
  "audit-weekly-report",
  "design-deliverables-purge",
  "destiny-one-purge",
  "destiny-one-sync",
  "destiny-one-video-expiry",
  "hr-review-reminders",
  "ip-reputation-refresh",
  "status-outage-alerts",
] as const;

test("cron failure payloads are one-line JSON with stable keys", () => {
  const raw = cronFailurePayload("click log anonymise", "rpc down", { route: "analytics-anonymise" });
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  expect(parsed.kind).toBe("cron_failure");
  expect(parsed.job).toBe("click log anonymise");
  expect(parsed.problem).toBe("rpc down");
  expect(parsed.route).toBe("analytics-anonymise");
  expect(typeof parsed.at).toBe("string");
});

test("problems longer than 500 characters are truncated in the payload", () => {
  const long = "x".repeat(600);
  const parsed = JSON.parse(cronFailurePayload("job", long)) as { problem: string };
  expect(parsed.problem).toHaveLength(500);
});

test("scheduled cron routes report ops failures instead of only console.error", () => {
  for (const route of CRON_ROUTES) {
    const source = readFileSync(
      join(process.cwd(), "app", "api", "cron", route, "route.ts"),
      "utf8",
    );
    expect(
      source,
      `${route} should call reportCronOpsFailure or sendOpsAlert on failures`,
    ).toMatch(/reportCronOpsFailure|sendOpsAlert/);
  }
});

test("logCronFailure emits parseable JSON after the prefix", () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (msg?: unknown) => {
    if (typeof msg === "string") lines.push(msg);
  };
  try {
    logCronFailure("unit", "oops", { route: "test" });
    const line = lines.find((l) => l.includes("cron_failure"));
    expect(line).toBeTruthy();
    const jsonStart = line!.indexOf("{");
    const parsed = JSON.parse(line!.slice(jsonStart)) as { kind: string };
    expect(parsed.kind).toBe("cron_failure");
  } finally {
    console.error = original;
  }
});