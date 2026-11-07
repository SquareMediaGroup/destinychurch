// Public: the voting page's state, and casting a vote.
// One vote per device per round. The device id is minted here and kept in an
// httpOnly cookie (the page also keeps a copy in local storage), so clearing
// one of them isn't enough to vote twice. Only its hash is stored.

import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  castVote,
  currentVote,
  getSettings,
  listActs,
  newVoterId,
  pickVoterId,
  VOTER_COOKIE,
} from "@/lib/talentShow.server";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

// The whole room shares the church Wi-Fi, so limits are per device and
// connection, with a looser cap per connection as a backstop.
function limited(kind: string, ip: string, voter: string | null, perDevice: number, perIp: number) {
  return (
    checkRateLimit(`talent-${kind}:${ip}:${voter ?? "-"}`, perDevice).limited ||
    checkRateLimit(`talent-${kind}-ip:${ip}`, perIp).limited
  );
}

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  const stored = request.nextUrl.searchParams.get("voter");
  const existing = pickVoterId(request.cookies.get(VOTER_COOKIE)?.value, stored);
  if (limited("read", ip, existing, 30, 900))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });

  const voterId = existing ?? newVoterId();
  const settings = await getSettings();
  const [acts, myVote] = await Promise.all([listActs(), currentVote(voterId, settings.round)]);

  const res = NextResponse.json({
    voter: voterId,
    showName: settings.show_name,
    open: settings.voting_open,
    myVote,
    acts: acts.map((a) => ({ id: a.id, name: a.name, performers: a.performers, description: a.description })),
  });
  res.cookies.set(VOTER_COOKIE, voterId, COOKIE_OPTS);
  return res;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    actId?: unknown;
    voter?: unknown;
    website?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "That act isn't available." }, { status: 400 });

  const voterId = pickVoterId(request.cookies.get(VOTER_COOKIE)?.value, body.voter);
  if (limited("vote", ip, voterId, 10, 300))
    return NextResponse.json({ error: "Slow down a little and try again shortly." }, { status: 429 });
  if (!voterId)
    return NextResponse.json({ error: "Something went wrong. Please refresh and try again." }, { status: 400 });

  // Honeypot: a person never sees this field.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const outcome = await castVote({ actId: body.actId, voterId, ip });
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

  const res = NextResponse.json({ ok: true, myVote: outcome.actId, changed: outcome.changed });
  res.cookies.set(VOTER_COOKIE, voterId, COOKIE_OPTS);
  return res;
}
