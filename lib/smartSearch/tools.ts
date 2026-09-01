import type OpenAI from "openai";
import Fuse from "fuse.js";
import { getPublishedProducts } from "@/lib/shop.server";
import { FIT_LABELS, fromPrice, type ProductWithVariants } from "@/lib/shop";
import { searchAssets } from "@/lib/playbook.server";
import { findPublicPhotosByPlaybookTokens } from "@/lib/media.server";

// ── Smart Search tools ─────────────────────────────────────────────────────
// Tool-calling tools the /api/chat route exposes to the model. Each network
// tool degrades gracefully (returns `available: false` + a human-readable
// reason) when its API key isn't configured, so the assistant can still hold a
// conversation and explain what's missing instead of erroring out.
//
// Restored from the removed Destiny AI feature (commit 7aa899d) — weather uses
// Open-Meteo (no key), directions a Google Maps embed, web search Tavily — plus
// a new `find_products` tool that surfaces real shop products.

const DESTINY_CENTRE_ADDRESS = "Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ";

/** Per-page content budget for search results fed back to the model. */
const SNIPPET_CHARS = 1200;
/** Per-page content budget for a full extract_page read. */
const EXTRACT_CHARS = 8000;

/**
 * Per-request state shared across tool calls. `seenUrls` records every URL a
 * search returned this request, so extract_page can only open pages we found
 * ourselves rather than any URL the conversation happens to contain.
 */
export interface ToolContext {
  seenUrls: Set<string>;
}

export function createToolContext(): ToolContext {
  return { seenUrls: new Set() };
}

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_products",
      description:
        "Search Destiny's shop for specific products to recommend (t-shirts, hoodies, books, other merch). Use when a visitor wants merch/apparel/a gift, or asks what to buy. If their request is broad (e.g. 'a shirt'), ask ONE short clarifying question first (fit, who it's for, or occasion) using OPTION lines, then call this with what they clarified. Pass a natural query plus filters when known.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "What the visitor is after, in a few words — include occasion/style hints, e.g. 'summer t-shirt', 'gift book'.",
          },
          fit: {
            type: "string",
            enum: ["male", "female", "unisex", "kids"],
            description: "Who the item is cut for, if the visitor made it clear.",
          },
          product_type: {
            type: "string",
            enum: ["clothing", "books", "other"],
            description: "Kind of product, if the visitor made it clear.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_photos",
      description:
        "Search /media's photo gallery for photos matching a description — e.g. 'photos of the worship team', 'youth camp pictures', 'the Easter service'. Use when a visitor asks to see photos, pictures, or images of something at Destiny.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What the visitor wants to see, as a natural description, e.g. 'kids on stage at Christmas'.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get a weather forecast for a specific date and place, e.g. to answer 'what's the weather like at Destiny Centre this Sunday'. Only use for real dates within the next 16 days.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description:
              "Place name to look up. Defaults to Destiny Centre / Stockton-on-Tees if omitted.",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format, resolved from context (e.g. 'this Sunday').",
          },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_directions",
      description:
        "Show an embedded map with directions/location for Destiny Centre, the church building. Use when someone asks how to get there, where it is, or for a map.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Search the live web for a real-world fact that helps someone visit or engage with Destiny, or that concerns Destiny itself — local travel or disruption, the local area, weather for a Sunday, or public-record facts about Destiny (e.g. its Charity Commission filings/annual accounts, which UK charities must publish). Use it whenever it would give a better, more current answer than guessing. Do NOT use it for general-knowledge trivia unrelated to Destiny or to visiting us, and only skip it for things genuinely never published anywhere, like staff pay or member/attendee personal data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A short, specific search query." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_page",
      description:
        "Open one page returned by a previous search_web call and read its full content. Use when the search snippets hint at an answer but don't actually contain it — e.g. a specific figure that lives on a Charity Commission or Companies House record. The url MUST be copied exactly from a search_web result; pages not returned by a search can't be opened.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The exact URL, copied verbatim from a previous search_web result.",
          },
        },
        required: ["url"],
      },
    },
  },
];

// ── find_products ──────────────────────────────────────────────────────────

/** A variant trimmed to just what the in-chat product card needs to add to cart. */
export interface ProductResultVariant {
  id: string;
  size: string;
  color: string;
  color_hex: string | null;
  price_pennies: number | null; // null → inherit base price
  stock: number;
}

/** A single product surfaced by find_products, shaped for the Smart Search card. */
export interface ProductResult {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  fitLabel: string;
  basePennies: number; // product base price, so the card can resolve variant prices
  fromPennies: number; // lowest in-stock price, for the "from £x" label
  variants: ProductResultVariant[];
}

export interface FindProductsResult {
  available: boolean;
  reason?: string;
  products?: ProductResult[];
}

const MAX_PRODUCT_RESULTS = 3;

// Whether a product's cut satisfies a requested fit. Unisex items are shared
// adult sizing, so they count for a "male" or "female" request too — otherwise
// an all-unisex catalogue returns nothing when someone asks for a men's shirt.
// "kids" (age-based sizing) stays exact.
function fitMatches(productFit: string, requested: string): boolean {
  if (requested === "male" || requested === "female") {
    return productFit === requested || productFit === "unisex";
  }
  return productFit === requested;
}

function toProductResult(p: ProductWithVariants): ProductResult {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0]?.url ?? null,
    fitLabel: FIT_LABELS[p.fit],
    basePennies: p.base_price_pennies,
    fromPennies: fromPrice(p),
    variants: p.variants
      .filter((v) => v.is_active)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        color_hex: v.color_hex,
        price_pennies: v.price_pennies,
        stock: v.stock,
      })),
  };
}

async function runFindProducts(args: {
  query: string;
  fit?: string;
  product_type?: string;
}): Promise<FindProductsResult> {
  try {
    const all = await getPublishedProducts();

    // Narrow by the structured filters the model extracted, when present.
    let pool = all;
    if (args.fit) pool = pool.filter((p) => fitMatches(p.fit, args.fit!));
    if (args.product_type) pool = pool.filter((p) => p.product_type === args.product_type);

    // Rank by free-text relevance across name/description/category. With no query
    // (or nothing matching), fall back to the filtered pool in storefront order.
    let ranked = pool;
    const query = args.query?.trim();
    if (query && pool.length > 0) {
      const fuse = new Fuse(pool, {
        keys: [
          { name: "name", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "category", weight: 0.2 },
        ],
        threshold: 0.5,
        ignoreLocation: true,
      });
      const hits = fuse.search(query).map((r) => r.item);
      if (hits.length > 0) ranked = hits;
    }

    const products = ranked.slice(0, MAX_PRODUCT_RESULTS).map(toProductResult);
    if (products.length === 0) {
      return { available: false, reason: "No matching products found." };
    }
    return { available: true, products };
  } catch (err) {
    console.error("[smartSearch] runFindProducts failed:", err);
    return { available: false, reason: "The shop lookup isn't working right now." };
  }
}

// ── find_photos (Playbook AI search, filtered to /media's public photos) ───

export interface PhotoResult {
  id: string;
  url: string;
  boardTitle: string;
  boardSlug: string;
}

export interface FindPhotosResult {
  available: boolean;
  reason?: string;
  photos?: PhotoResult[];
}

const MAX_PHOTO_RESULTS = 6;

async function runFindPhotos(args: { query: string }): Promise<FindPhotosResult> {
  try {
    // Playbook's ai_search runs across the WHOLE org — every board, including
    // ones that have nothing to do with /media and photos still sitting in
    // the moderation queue. findPublicPhotosByPlaybookTokens() is the actual
    // gate: only a token that is also an approved photo on a public board
    // ever makes it into what the assistant can show a visitor.
    const hits = await searchAssets(args.query);
    if (hits.length === 0) return { available: false, reason: "No matching photos found." };

    const matches = await findPublicPhotosByPlaybookTokens(hits.map((h) => h.token));
    if (matches.length === 0) return { available: false, reason: "No matching photos found." };

    return { available: true, photos: matches.slice(0, MAX_PHOTO_RESULTS) };
  } catch (err) {
    console.error("[smartSearch] runFindPhotos failed:", err);
    return { available: false, reason: "The photo gallery search isn't working right now." };
  }
}

// ── get_weather (Open-Meteo, no API key) ────────────────────────────────────

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
}

async function geocode(location: string): Promise<GeocodeResult | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(location)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { latitude: number; longitude: number; name: string; admin1?: string }[] };
  const hit = data.results?.[0];
  if (!hit) return null;
  return { latitude: hit.latitude, longitude: hit.longitude, name: [hit.name, hit.admin1].filter(Boolean).join(", ") };
}

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export interface WeatherToolResult {
  available: boolean;
  reason?: string;
  location?: string;
  date?: string;
  condition?: string;
  tempMaxC?: number;
  tempMinC?: number;
  precipitationChance?: number;
}

async function runGetWeather(args: { location?: string; date: string }): Promise<WeatherToolResult> {
  try {
    const place = await geocode(args.location?.trim() || "Stockton-on-Tees, United Kingdom");
    if (!place) {
      return { available: false, reason: "Could not find that location." };
    }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&start_date=${args.date}&end_date=${args.date}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { available: false, reason: "Forecast service is unavailable right now." };

    const data = (await res.json()) as {
      daily?: {
        time: string[];
        weathercode: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
      };
    };
    const i = data.daily?.time?.indexOf(args.date) ?? -1;
    if (!data.daily || i === -1) {
      return { available: false, reason: "That date is outside the 16-day forecast window." };
    }

    return {
      available: true,
      location: place.name,
      date: args.date,
      condition: WEATHER_CODE_LABELS[data.daily.weathercode[i]] ?? "Unknown",
      tempMaxC: Math.round(data.daily.temperature_2m_max[i]),
      tempMinC: Math.round(data.daily.temperature_2m_min[i]),
      precipitationChance: data.daily.precipitation_probability_max[i],
    };
  } catch {
    return { available: false, reason: "Weather lookup timed out." };
  }
}

// ── get_directions (Google Maps embed, optional key) ────────────────────────

export interface DirectionsToolResult {
  available: boolean;
  address: string;
  embedUrl?: string;
  mapsUrl: string;
}

function runGetDirections(): DirectionsToolResult {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DESTINY_CENTRE_ADDRESS)}`;
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  return {
    available: Boolean(embedKey),
    address: DESTINY_CENTRE_ADDRESS,
    embedUrl: embedKey
      ? `https://www.google.com/maps/embed/v1/place?key=${embedKey}&q=${encodeURIComponent(DESTINY_CENTRE_ADDRESS)}`
      : undefined,
    mapsUrl,
  };
}

// ── search_web (Tavily, optional key) ───────────────────────────────────────

export interface SearchWebResult {
  available: boolean;
  reason?: string;
  results?: { title: string; url: string; snippet: string }[];
}

// Tavily's own `include_answer` summary is deliberately NOT requested: it
// conflated Destiny Church Tees Valley with the unrelated Scottish charity
// "Destiny Church Trust" (SC017898) and reported a ~5x wrong income figure.
// We pass the model real page content instead and let it ground its own answer.
async function runSearchWeb(args: { query: string }, ctx: ToolContext): Promise<SearchWebResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { available: false, reason: "Web search isn't configured yet." };
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: args.query,
        max_results: 4,
        // "advanced" returns curated, relevant chunks rather than the top of the
        // page — without it, results are mostly cookie banners.
        search_depth: "advanced",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { available: false, reason: "Search service is unavailable right now." };
    const data = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
    const results = (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, SNIPPET_CHARS) ?? "",
    }));
    // Record what we surfaced so extract_page can only follow links we found.
    for (const r of results) ctx.seenUrls.add(r.url);
    return { available: true, results };
  } catch {
    return { available: false, reason: "Search timed out." };
  }
}

// ── extract_page (Tavily /extract, same key) ─────────────────────────────────

export interface ExtractPageResult {
  available: boolean;
  reason?: string;
  url?: string;
  content?: string;
}

async function runExtractPage(args: { url: string }, ctx: ToolContext): Promise<ExtractPageResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { available: false, reason: "Page extraction isn't configured yet." };

  // Only follow links a previous search actually returned. Stops the tool being
  // steered into fetching arbitrary attacker- or visitor-supplied URLs.
  if (!ctx.seenUrls.has(args.url)) {
    return { available: false, reason: "That page didn't come from a search result, so it wasn't opened." };
  }

  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ urls: [args.url], extract_depth: "advanced" }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { available: false, reason: "Couldn't open that page right now." };
    const data = (await res.json()) as { results?: { url: string; raw_content: string }[] };
    const hit = data.results?.[0];
    if (!hit?.raw_content) return { available: false, reason: "That page couldn't be read." };
    return { available: true, url: hit.url, content: hit.raw_content.slice(0, EXTRACT_CHARS) };
  } catch {
    return { available: false, reason: "Opening that page timed out." };
  }
}

// ── dispatch ────────────────────────────────────────────────────────────────

export type ToolResult =
  | { name: "find_products"; data: FindProductsResult }
  | { name: "find_photos"; data: FindPhotosResult }
  | { name: "get_weather"; data: WeatherToolResult }
  | { name: "get_directions"; data: DirectionsToolResult }
  | { name: "search_web"; data: SearchWebResult }
  | { name: "extract_page"; data: ExtractPageResult };

/** Execute a single tool call by name, parsing its JSON argument string. */
export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    // fall through with empty args
  }

  switch (name) {
    case "find_products":
      return {
        name,
        data: await runFindProducts({
          query: (args.query as string) ?? "",
          fit: args.fit as string | undefined,
          product_type: args.product_type as string | undefined,
        }),
      };
    case "find_photos":
      return { name, data: await runFindPhotos({ query: (args.query as string) ?? "" }) };
    case "get_weather":
      return { name, data: await runGetWeather({ location: args.location as string | undefined, date: args.date as string }) };
    case "get_directions":
      return { name, data: runGetDirections() };
    case "search_web":
      return { name, data: await runSearchWeb({ query: args.query as string }, ctx) };
    case "extract_page":
      return { name, data: await runExtractPage({ url: args.url as string }, ctx) };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
