export interface LLMClient {
  generatePageStructure(prompt: string): Promise<string>;
}

/**
 * Anthropic Claude LLM Client
 */
export class AnthropicLLMClient implements LLMClient {
  private apiKey: string;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "claude-3-5-sonnet-20241022") {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  async generatePageStructure(prompt: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 4096,
        system: `You are an expert church website designer. Your job is to create page structures using pre-built semantic components. Always respond with ONLY valid JSON, no markdown, no explanation.`,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    const content = data.content[0];

    if (content.type !== "text") {
      throw new Error("Unexpected response format from Anthropic API");
    }

    return content.text;
  }
}

/**
 * OpenAI GPT LLM Client
 */
export class OpenAILLMClient implements LLMClient {
  private apiKey: string;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "gpt-4o-mini") {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  async generatePageStructure(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 4096,
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
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
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
 */
export function createLLMClient(): LLMClient {
  const provider = process.env.AI_PROVIDER || "anthropic";
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Use mock client if explicitly requested or if no keys are available
  if (provider === "mock" || (!anthropicKey && !openaiKey)) {
    console.warn("Using mock LLM client. Set AI_PROVIDER and relevant API keys to use real LLMs.");
    return new MockLLMClient();
  }

  if (provider === "anthropic") {
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY env var is required when AI_PROVIDER=anthropic");
    }
    return new AnthropicLLMClient(anthropicKey);
  }

  if (provider === "openai") {
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY env var is required when AI_PROVIDER=openai");
    }
    return new OpenAILLMClient(openaiKey);
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
