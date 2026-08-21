import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

const BUCKET = "hr-documents";
const SIGNED_URL_TTL_SECONDS = 60;

// A signed download URL for one document — own, or org-wide (staff_id null).
// 404 (not 403) when it belongs to someone else, so ID-guessing can't
// distinguish "not yours" from "doesn't exist".
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: doc } = await supabase
    .from("hr_documents")
    .select("id, staff_id, file_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (!doc || (doc.staff_id !== null && doc.staff_id !== identity.staff.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: "Could not create a download link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, file_name: doc.file_name });
}
