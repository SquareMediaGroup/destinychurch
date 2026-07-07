"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseAnswer } from "@/lib/smartSearch";
import { WeatherCard, DirectionsCard, SearchResultsCard } from "./ToolCards";

type ToolName = "get_weather" | "get_directions" | "search_web";

interface ToolInvocation {
  id: string;
  name: ToolName;
  status: "running" | "done";
  data?: unknown;
}

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  tools?: ToolInvocation[];
  page?: string | null;
  ctaLabel?: string | null;
}

type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool_call"; id: string; name: ToolName }
  | { type: "tool_result"; id: string; name: ToolName; data: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

const STARTERS = [
  "What's the weather like this Sunday?",
  "How do I get to Destiny Centre?",
  "What time does the service start?",
  "How do I get baptised?",
];

// Hide trailing PAGE:/CTA: lines while the reply is still streaming in.
function visibleProse(raw: string): string {
  return raw
    .replace(/^\s*PAGE:.*$/gim, "")
    .replace(/^\s*CTA:.*$/gim, "")
    .trimEnd();
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function ToolInvocationView({ tool }: { tool: ToolInvocation }) {
  if (tool.status === "running") {
    const label =
      tool.name === "get_weather" ? "Checking the forecast…" : tool.name === "get_directions" ? "Finding the map…" : "Searching…";
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey/50">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/10 border-t-destiny-orange" />
        {label}
      </div>
    );
  }
  if (tool.name === "get_weather") return <WeatherCard data={tool.data as never} />;
  if (tool.name === "get_directions") return <DirectionsCard data={tool.data as never} />;
  return <SearchResultsCard data={tool.data as never} />;
}

export default function DestinyAiChat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || trimmed.length > 500) return;

      const history = [...messages, { role: "user" as const, content: trimmed }];
      setMessages([...history, { role: "assistant", content: "", tools: [] }]);
      setInput("");
      setLoading(true);

      const updateLast = (fn: (m: UiMessage) => UiMessage) =>
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)));

      try {
        const res = await fetch("/api/destiny-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
        });

        if (res.status === 429) {
          updateLast((m) => ({
            ...m,
            content: "You've asked a lot of questions in a short time — give it a minute and try again.",
          }));
          return;
        }
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "text") {
              raw += event.value;
              setLoading(false);
              const prose = visibleProse(raw);
              updateLast((m) => ({ ...m, content: prose }));
            } else if (event.type === "tool_call") {
              setLoading(false);
              updateLast((m) => ({
                ...m,
                tools: [...(m.tools ?? []), { id: event.id, name: event.name, status: "running" }],
              }));
            } else if (event.type === "tool_result") {
              updateLast((m) => ({
                ...m,
                tools: (m.tools ?? []).map((t) => (t.id === event.id ? { ...t, status: "done", data: event.data } : t)),
              }));
            } else if (event.type === "error") {
              setLoading(false);
              updateLast((m) => ({ ...m, content: event.message }));
            }
          }
        }

        const parsed = parseAnswer(raw);
        updateLast((m) => ({ ...m, content: parsed.answer, page: parsed.page, ctaLabel: parsed.ctaLabel }));
      } catch {
        updateLast((m) => ({ ...m, content: "I can't reach Destiny AI right now — please try again in a moment." }));
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col">
      {/* Conversation */}
      <div className="min-h-[40vh] space-y-5">
        {!hasMessages && (
          <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
            <p className="text-sm text-destiny-grey/55">
              Ask about visiting, service times, directions, or the weather for Sunday. For anything
              else, a general assistant like Claude, ChatGPT, or Gemini will serve you better.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10">
                <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
              </div>
            )}
            <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
              {(msg.content || msg.role === "user") && (
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-destiny-orange text-white"
                      : "rounded-tl-sm border border-black/10 bg-white text-destiny-grey"
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {msg.tools?.map((tool) => <ToolInvocationView key={tool.id} tool={tool} />)}

              {msg.role === "assistant" && i === messages.length - 1 && msg.page && msg.ctaLabel && (
                <Link
                  href={msg.page}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                >
                  {msg.ctaLabel}
                  <span className="material-symbols-rounded text-sm">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10">
              <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-black/10 bg-white px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-destiny-grey/30" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-destiny-grey/30" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-destiny-grey/30" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-4 mt-6 sm:bottom-6">
        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white p-1.5 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.25)]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Destiny AI…"
            disabled={loading}
            maxLength={500}
            className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white transition hover:brightness-110 disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-xl">arrow_upward</span>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-destiny-grey/35">Destiny AI can make mistakes — check important details with the church office.</p>
      </form>
    </div>
  );
}
