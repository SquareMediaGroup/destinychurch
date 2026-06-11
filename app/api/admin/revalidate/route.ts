import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";

export async function POST() {
  const denied = await requireUser();
  if (denied) return denied;

  revalidatePath("/");
  revalidatePath("/whats-on");
  revalidatePath("/sermons");
  revalidatePath("/new-here");
  return NextResponse.json({ ok: true, revalidated: ["/", "/whats-on", "/sermons", "/new-here"] });
}
