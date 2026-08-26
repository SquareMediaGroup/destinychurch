import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";

const PATHS = ["/", "/whats-on", "/sermons", "/new-here"];

export async function POST() {
  for (const path of PATHS) revalidatePath(path);

  await recordAudit({
    action: "revalidate",
    section: "site",
    entity: "cache",
    entityLabel: "Site cache",
    summary: `Cleared the cache for ${PATHS.join(", ")}`,
    metadata: { paths: PATHS },
  });

  return NextResponse.json({ ok: true, revalidated: PATHS });
}
