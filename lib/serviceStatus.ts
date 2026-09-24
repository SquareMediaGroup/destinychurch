import { createServiceClient } from "@/utils/supabase/service";

// Runtime kill-switch / health state for Smart Search, backed by the
// `service_status` Supabase table. Reads FAIL OPEN: if the table or Supabase is
// unreachable we treat the service as enabled so a status-store blip never takes
// Smart Search offline on its own.

const SERVICE = "smart_search";

export interface ServiceStatus {
  enabled: boolean;
  reason: string | null;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  consecutiveFailures: number;
}

const DEFAULT_STATUS: ServiceStatus = {
  enabled: true,
  reason: null,
  lastCheckAt: null,
  nextCheckAt: null,
  consecutiveFailures: 0,
};

export async function getSmartSearchStatus(): Promise<ServiceStatus> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("service_status")
      .select("enabled, reason, last_check_at, next_check_at, consecutive_failures")
      .eq("service", SERVICE)
      .maybeSingle();

    if (error || !data) return DEFAULT_STATUS;

    return {
      enabled: data.enabled ?? true,
      reason: data.reason ?? null,
      lastCheckAt: data.last_check_at ?? null,
      nextCheckAt: data.next_check_at ?? null,
      consecutiveFailures: data.consecutive_failures ?? 0,
    };
  } catch {
    return DEFAULT_STATUS;
  }
}

export async function isSmartSearchEnabled(): Promise<boolean> {
  return (await getSmartSearchStatus()).enabled;
}

export async function setSmartSearchStatus(patch: {
  enabled: boolean;
  reason: string | null;
  nextCheckAt: string;
  consecutiveFailures: number;
}): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  await supabase.from("service_status").upsert(
    {
      service: SERVICE,
      enabled: patch.enabled,
      reason: patch.reason,
      last_check_at: now,
      next_check_at: patch.nextCheckAt,
      consecutive_failures: patch.consecutiveFailures,
      updated_at: now,
    },
    { onConflict: "service" },
  );
}
