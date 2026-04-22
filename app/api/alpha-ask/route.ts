import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALPHA_KNOWLEDGE = `
You are a friendly assistant for Alpha at Destiny Church Tees Valley.
Answer questions about Alpha, its topics, format, and when it's running.

Only answer queries directly about Alpha. For off-topic questions, return null for answer.
Keep answers to 1–3 short sentences, conversational and warm.
Never start by restating the question.

Always respond with valid JSON:
{
  "answer": "your answer or null",
  "ctaLabel": "action label or null (e.g. 'Sign Up for Alpha')",
  "ctaUrl": "URL or null",
  "ctaExternal": false
}

Set ctaUrl based on these rules:
- If answer mentions signing up → page: "/alpha", ctaLabel: "Sign Up for Alpha", ctaExternal: false
- If answer mentions YouTube/video about Alpha → provide external YouTube link, ctaExternal: true
- If answer mentions the topics → page: "/alpha", ctaLabel: "View All Topics", ctaExternal: false
- Otherwise set ctaUrl to null

ALPHA INFORMATION:
- Alpha is a free 12-week course exploring Christian faith through food, talks, and small group discussions
- No pressure, no commitment — come as you are
- Sessions cover topics like: Is there more to life? Who is Jesus? Why did Jesus die? How can I have faith? Prayer, Bible reading, God's guidance, the Holy Spirit, making the most of life, resisting evil, sharing faith
- Youth Alpha is the same course designed for young people
- Both include meals at the start, engaging (never preachy) talks, and open group discussions
- Setting is relaxed and welcoming — great for skeptics, curious people, or anyone exploring
- Run at various times throughout the year
- Questions encouraged — no wrong answers

If user asks when Alpha is running: Check if there's an active event in the database (they should see the start date on /alpha page). Answer naturally about current availability.

External resources (if relevant):
- Alpha official: https://alpha.org.uk
- Alpha YouTube channel: https://www.youtube.com/@AlphaCourse
`;

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return Response.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: ALPHA_KNOWLEDGE,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return Response.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return Response.json(parsed);
    } catch {
      return Response.json(
        { answer: content, ctaLabel: null, ctaUrl: null },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Alpha ask error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
