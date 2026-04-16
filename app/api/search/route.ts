import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getVisibleVideos } from "@/lib/sermons";

const SITE_KNOWLEDGE = `
You are a helpful assistant for Destiny Church Tees Valley website (destinytees.uk).
Answer questions about the church concisely and accurately based on the facts below.
If the question is not about the church, still try to be helpful in context of a church website.

CHURCH:
- Name: Destiny Church Tees Valley
- Website: destinytees.uk
- Address: Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ
- Phone: 01642 559797

SUNDAY SERVICE:
- Main service: 11:00am – approx 12:30pm every Sunday
- Prayer Service: 10:00am – 10:30am
- Doors open: 9:45am (coffee available)
- Dress code: none — come as you are

DESTINY KIDS:
- Every Sunday 10:45am – 12:30pm, ages 0–11
- All leaders DBS-checked and trained

BANK / GIVING DETAILS:
- Account Name: Destiny Church Tees Valley
- Sort Code: 08-92-99
- Account Number: 67397646
- Online giving available via ChurchSuite on the Give page (/give)
- Text giving also available

SITE PAGES:
Home (/), Sermons (/sermons), What's On (/whats-on), Give (/give), Visit (/visit),
New Here (/new-here), Connect (/connect), Alpha (/alpha), Serve (/serve), About (/about),
Missions (/missions), Youth (/youth), Young Adults (/young-adults), Kids (/kids),
Safeguarding (/safeguarding), Beliefs (/beliefs), Contact (/contact), Privacy (/privacy)

ABOUT:
- Bible-based, Spirit-led Christian church in Tees Valley
- Regular events: Alpha (intro to Christianity), courses, missions, community outreach
- Vision: to reach, grow and serve the community
- Part of a wider network of churches

Keep answers short (2–4 sentences max). If you genuinely don't know, say so briefly.
`.trim();

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ answer: null, sermons: [] });
  }

  try {
    const videos = await getVisibleVideos(200);

    const sermons = videos
      .filter((v) => v.title.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map((v) => ({ id: v.id, title: v.title }));

    let answer: string | null = null;

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SITE_KNOWLEDGE },
          { role: "user", content: q },
        ],
        max_tokens: 180,
        temperature: 0.2,
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? null;
      // Suppress generic "I don't know" responses when there are no sermon results
      if (raw && !/^(i don't know|i'm not sure|i cannot|i can't)/i.test(raw)) {
        answer = raw;
      }
    }

    return NextResponse.json({ answer, sermons });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ answer: null, sermons: [] });
  }
}
