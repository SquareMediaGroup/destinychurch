import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // YouTube video IDs are 11 chars of [A-Za-z0-9_-]. Reject anything else so
  // the param can't smuggle path traversal or query strings into the fetch URL.
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const urls = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];

  for (const url of urls) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          // A video's thumbnail almost never changes after upload, and the
          // old 5-minute TTL made browsers refetch ~140 KB every visit.
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
