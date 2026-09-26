import { NextResponse } from "next/server";
import { isAdult } from "@destiny/shared";
import { requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import {
  ChurchSuiteUnavailable,
  churchSuiteConfigured,
  findPeopleByEmail,
} from "@/lib/destinyOne/churchsuite.server";

// GET /api/admin/destiny-one/churchsuite?q=<email or name>
//
// OPTIONAL helper on the approvals screen: "is this person in ChurchSuite?"
// Returns names, record type and an adult flag — the data-minimising
// toPerson() allow-list still applies, so no phone, address or medical data.
// Nothing here is required to approve anyone; when ChurchSuite isn't
// configured the admin pages simply hide the button.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  if (!churchSuiteConfigured()) {
    return NextResponse.json({ error: "ChurchSuite isn't connected." }, { status: 404 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json([]);

  try {
    const people = await findPeopleByEmail(q);
    return NextResponse.json(
      people.map((p) => ({
        kind: p.kind,
        id: p.id,
        displayName: p.displayName,
        isAdult: isAdult(p.adultOn),
        emailMatches: p.email === q.toLowerCase(),
        status: p.status,
      })),
    );
  } catch (err) {
    if (err instanceof ChurchSuiteUnavailable) {
      return NextResponse.json({ error: "ChurchSuite isn't responding. Try again shortly." }, { status: 503 });
    }
    throw err;
  }
}
