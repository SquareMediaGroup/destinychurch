export interface LLMClient {
  generatePageStructure(prompt: string): Promise<string>;
}

/**
 * Status codes worth retrying on. 408/425/429 are throttling, 5xx are server errors.
 */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_LLM_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 2000;

function backoff(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const secs = Number(retryAfterHeader);
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 30_000);
  }
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), 30_000);
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code;
  if (code && ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"].includes(code)) {
    return true;
  }
  return /network|fetch failed|aborted|socket hang up|timed out/i.test(err.message);
}

/**
 * Vercel AI Gateway LLM Client
 * Unified interface for Claude via Vercel's platform
 */
export class VercelAIGatewayClient implements LLMClient {
  private apiKey: string;
  private modelId: string;
  private gatewayUrl: string;

  constructor(
    apiKey: string,
    modelId: string = "anthropic/claude-sonnet-4-5",
    gatewayUrl: string = "https://ai-gateway.vercel.sh/v1"
  ) {
    if (!apiKey) {
      throw new Error("VERCEL_AI_GATEWAY_TOKEN is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.gatewayUrl = gatewayUrl;
  }

  async generatePageStructure(prompt: string): Promise<string> {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
      try {
        return await this.callOnce(prompt);
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        const status = (err as { status?: number }).status;
        const retryable = (status && RETRYABLE_STATUS.has(status)) || isRetryableNetworkError(err);
        if (!retryable || attempt === MAX_LLM_ATTEMPTS) {
          throw lastErr;
        }
        const retryAfter = (err as { retryAfter?: string }).retryAfter ?? null;
        const waitMs = backoff(attempt, retryAfter);
        console.warn(
          `⚠ LLM call failed (attempt ${attempt}/${MAX_LLM_ATTEMPTS}): ${lastErr.message}. Retrying in ${waitMs}ms…`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    throw lastErr ?? new Error("LLM call failed");
  }

  private async callOnce(prompt: string): Promise<string> {
    const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 32000,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert church website designer. Your job is to create page structures using pre-built semantic components. Always respond with ONLY valid JSON, no markdown, no explanation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMsg = `HTTP ${response.status}`;

      try {
        if (contentType?.includes("application/json")) {
          const error = await response.json() as { error?: { message?: string }; message?: string };
          errorMsg = error.error?.message || error.message || errorMsg;
        } else {
          const text = await response.text();
          errorMsg = text.slice(0, 300);
        }
      } catch {
        // If we can't parse error response, use status
      }

      const e = new Error(`Vercel AI Gateway error (${response.status}): ${errorMsg}`) as Error & {
        status?: number;
        retryAfter?: string | null;
      };
      e.status = response.status;
      e.retryAfter = response.headers.get("retry-after");
      throw e;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Expected JSON response but got ${contentType || "unknown type"}: ${text.slice(0, 300)}`);
    }

    let data;
    try {
      data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
    } catch (err) {
      throw new Error(`Failed to parse JSON response: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid response structure: missing content");
    }

    return data.choices[0].message.content;
  }
}


/**
 * Mock LLM Client for testing (returns predefined page structures)
 */
export class MockLLMClient implements LLMClient {
  private mockResponses: Map<string, string> = new Map();

  constructor() {
    // Default mock responses for common page types
    this.mockResponses.set(
      "alpha",
      JSON.stringify([
        {
          type: "HeroSection",
          props: {
            title: "Alpha - A chance to explore life, faith and meaning",
            subtitle: "Join a small group for conversations about life's big questions",
            ctas: [
              {
                label: "Sign Up for Alpha",
                href: "/alpha/signup",
                variant: "primary",
              },
            ],
          },
        },
        {
          type: "EveryoneHasAPlaceSection",
          props: {
            title: "Everyone is welcome",
            description: "Alpha is for anyone asking questions about life and faith. No judgment, no pressure.",
          },
        },
        {
          type: "GetInvolvedSection",
          props: {
            title: "Get Involved",
            description: "Join us for Alpha sessions starting soon",
            ctas: [
              {
                label: "Register Now",
                href: "/alpha/register",
              },
            ],
          },
        },
      ])
    );

    this.mockResponses.set(
      "about",
      JSON.stringify([
        {
          type: "AboutHero",
          props: {
            title: "About Destiny Church",
            subtitle: "Our story, mission, and values",
          },
        },
        {
          type: "AboutMissionStatement",
          props: {
            content: "We exist to share the love of Jesus and help people grow in their faith.",
          },
        },
        {
          type: "MeetPastorsSection",
          props: {
            title: "Meet Our Pastors",
            description: "Get to know the leaders of our church community",
          },
        },
        {
          type: "TeamSection",
          props: {
            title: "Our Team",
            description: "We're a team of dedicated volunteers and staff",
          },
        },
      ])
    );

    this.mockResponses.set(
      "giving",
      JSON.stringify([
        {
          type: "HeroSection",
          props: {
            title: "Give to Destiny Church",
            subtitle: "Your generosity helps us serve the community",
            ctas: [
              {
                label: "Give Now",
                href: "https://giving.destinychurch.com",
              },
            ],
          },
        },
        {
          type: "GetInvolvedSection",
          props: {
            title: "More Ways to Give",
            description: "Automatic giving, online, or in-person",
          },
        },
      ])
    );
  }

  async generatePageStructure(prompt: string): Promise<string> {
    // Try to detect page type from prompt
    let pageType = "alpha"; // default

    if (prompt.toLowerCase().includes("about")) {
      pageType = "about";
    } else if (prompt.toLowerCase().includes("giving") || prompt.toLowerCase().includes("donate")) {
      pageType = "giving";
    }

    const mockResponse = this.mockResponses.get(pageType);
    if (!mockResponse) {
      // Return a generic structure
      return JSON.stringify([
        {
          type: "HeroSection",
          props: {
            title: "Welcome",
            subtitle: "Explore our community",
          },
        },
      ]);
    }

    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return mockResponse;
  }

  // Add custom mock response for testing
  addMockResponse(key: string, response: string): void {
    this.mockResponses.set(key, response);
  }
}

/**
 * Factory function to create appropriate LLM client based on env vars
 * Defaults to Vercel AI Gateway for Claude Sonnet
 */
export function createLLMClient(): LLMClient {
  const provider = process.env.AI_PROVIDER || "vercel";
  const vercelToken = process.env.VERCEL_AI_GATEWAY_TOKEN;
  const vercelModel = process.env.VERCEL_AI_MODEL || "anthropic/claude-sonnet-4-5";

  // Use mock client if explicitly requested or if no keys are available
  if (provider === "mock") {
    console.warn("Using mock LLM client. Set VERCEL_AI_GATEWAY_TOKEN to use real Claude Sonnet.");
    return new MockLLMClient();
  }

  if (provider === "vercel") {
    if (!vercelToken) {
      console.warn("VERCEL_AI_GATEWAY_TOKEN not set. Falling back to mock LLM client.");
      return new MockLLMClient();
    }
    return new VercelAIGatewayClient(vercelToken, vercelModel);
  }

  throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}

/**
 * Get LLM client singleton
 */
let llmClientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClientInstance) {
    llmClientInstance = createLLMClient();
  }
  return llmClientInstance;
}

// Allow resetting for testing
export function resetLLMClient(): void {
  llmClientInstance = null;
}
