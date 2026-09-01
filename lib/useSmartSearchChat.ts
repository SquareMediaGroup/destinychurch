import { useCallback, useState } from "react";
import { cooldownAnswer, parseAnswer } from "@/lib/smartSearch";
import type {
  ProductResult,
  WeatherToolResult,
  DirectionsToolResult,
  SearchWebResult,
  PhotoResult,
} from "@/lib/smartSearch/tools";

// Hide the trailing OPTION:/PAGE:/CTA: lines while text is still streaming in, so
// the visitor only ever sees clean prose. The full reply is parsed once complete.
function visibleProse(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]\s*|\d+[.)]\s*)?OPTION:.*$/gim, "")
    .replace(/^\s*PAGE:.*$/gim, "")
    .replace(/^\s*CTA:.*$/gim, "")
    .replace(/^\s*[-=]{3,}\s*$/gm, "")
    .trimEnd();
}

export interface ToolCards {
  products?: ProductResult[];
  photos?: PhotoResult[];
  weather?: WeatherToolResult;
  directions?: DirectionsToolResult;
  web?: SearchWebResult;
}

export interface ChatMessage extends ToolCards {
  role: "user" | "assistant";
  content: string;
  options?: string[]; // assistant: tappable clarifying chips
  page?: string | null; // assistant: CTA target
  ctaLabel?: string | null;
}

export const TOOL_STATUS_LABELS: Record<string, string> = {
  find_products: "Searching the shop…",
  find_photos: "Searching the photo gallery…",
  get_weather: "Checking the forecast…",
  get_directions: "Looking up directions…",
  search_web: "Searching the web…",
  extract_page: "Reading the page…",
};

/**
 * Core Smart Search conversation logic shared by every UI surface (the
 * floating pill, the 404 page box, etc). Talks to the same /api/chat
 * streaming endpoint and produces the same messages/cards/options/CTA — only
 * the presentation differs per surface.
 */
export function useSmartSearchChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const reset = useCallback(() => {
    setMessages([]);
    setLoading(false);
    setToolStatus(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || trimmed.length > 300) return;

      setLoading(true);

      const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(history);
      setToolStatus(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (res.status === 429) {
          setMessages((prev) => [...prev, { role: "assistant", content: cooldownAnswer().answer, page: cooldownAnswer().page, ctaLabel: cooldownAnswer().ctaLabel }]);
          return;
        }

        if (!res.body) {
          // No stream (shouldn't happen) — fall back to reading the whole body.
          const text = await res.text();
          const parsed = parseAnswer(text);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: parsed.answer, options: parsed.options, page: parsed.page, ctaLabel: parsed.ctaLabel },
          ]);
          return;
        }

        // The route streams newline-delimited JSON events: `text` tokens build the
        // prose bubble (still parsed for OPTION/PAGE/CTA), `tool_result` events
        // attach a card. We append the assistant message once there's something to
        // show (visible prose or a card), then keep rewriting it until `done`.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";
        const cards: ToolCards = {};
        let appended = false;

        const hasCards = () =>
          Boolean(cards.products || cards.photos || cards.weather || cards.directions || cards.web);

        const liveMessage = (): ChatMessage => ({
          role: "assistant",
          content: visibleProse(raw),
          ...cards,
        });

        const sync = () => {
          const hasContent = visibleProse(raw).length > 0 || hasCards();
          if (!appended && !hasContent) return; // nothing to show yet
          const msg = liveMessage();
          if (!appended) {
            appended = true;
            setLoading(false);
            setMessages((prev) => [...prev, msg]);
          } else {
            setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? msg : m)));
          }
        };

        const handleEvent = (evt: { type: string; value?: string; name?: string; data?: unknown }) => {
          if (evt.type === "text" && typeof evt.value === "string") {
            raw += evt.value;
            sync();
          } else if (evt.type === "tool_call" && evt.name) {
            setToolStatus(TOOL_STATUS_LABELS[evt.name] ?? "Looking that up…");
          } else if (evt.type === "tool_result") {
            setToolStatus(null);
            switch (evt.name) {
              case "find_products":
                cards.products = (evt.data as { products?: ProductResult[] }).products;
                break;
              case "find_photos":
                cards.photos = (evt.data as { photos?: PhotoResult[] }).photos;
                break;
              case "get_weather":
                cards.weather = evt.data as WeatherToolResult;
                break;
              case "get_directions":
                cards.directions = evt.data as DirectionsToolResult;
                break;
              case "search_web":
                cards.web = evt.data as SearchWebResult;
                break;
            }
            sync();
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            try {
              handleEvent(JSON.parse(line));
            } catch {
              // ignore malformed lines
            }
          }
        }

        // Finalise: parse the completed prose for clarifying chips / CTA, and keep
        // the collected cards. Fall back to the parsed answer only when there's no
        // prose and no cards (so a tool-only reply doesn't show a "no results" line).
        const parsed = parseAnswer(raw);
        const proseFinal = visibleProse(raw);
        const finalMsg: ChatMessage = {
          role: "assistant",
          content: proseFinal || (hasCards() ? "" : parsed.answer),
          options: parsed.options,
          page: parsed.page,
          ctaLabel: parsed.ctaLabel,
          ...cards,
        };
        if (!appended) {
          setLoading(false);
          setMessages((prev) => [...prev, finalMsg]);
        } else {
          setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? finalMsg : m)));
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I can't reach the assistant right now — please try again in a moment.",
          },
        ]);
      } finally {
        setLoading(false);
        setToolStatus(null);
      }
    },
    [loading, messages]
  );

  return { messages, loading, toolStatus, sendMessage, reset };
}
