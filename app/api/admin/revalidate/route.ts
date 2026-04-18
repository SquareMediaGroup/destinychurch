import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  revalidatePath("/");
  revalidatePath("/whats-on");
  revalidatePath("/sermons");
  revalidatePath("/new-here");
  return NextResponse.json({ ok: true, revalidated: ["/", "/whats-on", "/sermons", "/new-here"] });
}
