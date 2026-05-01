import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const urls = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.webp`,
    `https://i.ytimg.com/vi/${id}/hqdefault.webp`,
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
