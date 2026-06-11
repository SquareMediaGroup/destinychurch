import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // YouTube video IDs are exactly 11 URL-safe characters; reject anything else
  // so this proxy can't be pointed at arbitrary ytimg paths.
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
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
