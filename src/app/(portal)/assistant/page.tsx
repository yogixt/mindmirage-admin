"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PageHeader, Card } from "../ui";
import { Send, Sparkles, RefreshCw, Database } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const QUICK_ACTIONS = [
  { label: "List today's bookings", prompt: "Show me all bookings received or scheduled for today." },
  { label: "Revenue breakdown", prompt: "Provide a summary of total revenue grouped by course or offerings." },
  { label: "Pending assignments", prompt: "List any assignment submissions currently waiting for review." },
  { label: "Recent payments log", prompt: "Show the last 5 successful order payments received." },
  { label: "Sadhak registration count", prompt: "Show me the count of registered sadhaks, grouped by their city." },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I am the Kutir AI Assistant. I can query our Turso database in real-time to list, analyze, and summarize bookings, orders, sadhaks, assignments, and calendar details. How can I help you manage the kutir today?",
      created_at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  const send = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || pending) return;

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: text,
        created_at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? `Server error: ${res.status}`);
      }

      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.content,
          created_at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: `⚠️ Error: ${err instanceof Error ? err.message : String(err)}. Please check connection or try again.`,
          created_at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  function parseFormatting(text: string) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  }

  function renderContent(text: string) {
    const blocks = text.split("\n\n");
    return (
      <div className="space-y-3">
        {blocks.map((block, i) => {
          const trimmed = block.trim();

          // Parse markdown table
          if (trimmed.startsWith("|") && trimmed.includes("\n|")) {
            const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
            const headers = lines[0].split("|").map((s) => s.trim()).filter(Boolean);
            const rows = lines.slice(2).map((line) => {
              return line.split("|").map((s) => s.trim()).filter(Boolean);
            });

            return (
              <div key={i} className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {headers.map((h, idx) => (
                        <th key={idx} className="px-4 py-2.5 text-left font-semibold text-slate-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2 text-slate-600 whitespace-pre-line">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          // Parse bullet points
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const items = trimmed.split("\n").map((item) => item.replace(/^[-*]\s+/, "").trim());
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-slate-700">
                {items.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    {parseFormatting(item)}
                  </li>
                ))}
              </ul>
            );
          }

          // Default paragraph
          return (
            <p key={i} className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {parseFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Kutir AI Assistant"
        deva="सहायक"
        sub="Chat with your co-pilot to inspect bookings, revenue logs, availability calendar, and seeker profiles."
        action={
          <button
            onClick={() => setMessages([messages[0]])}
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Reset Chat
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left side: Chat area */}
        <div className="flex flex-col h-[calc(100vh-230px)]">
          <Card className="flex flex-col flex-1 min-h-0 p-4">
            {/* Scrollable messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-4 pr-2"
            >
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-75">
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          {isUser ? "You" : "Assistant"}
                        </span>
                        <span className="text-[9px]">•</span>
                        <span className="text-[9px]">{m.created_at}</span>
                      </div>
                      <div className={isUser ? "text-sm text-white" : "text-sm text-slate-800"}>
                        {isUser ? <p className="whitespace-pre-line">{m.content}</p> : renderContent(m.content)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {pending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Running database checks...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input field */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about revenue, specific sadhaks, bookings, or class calendar..."
                disabled={pending}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7CFA] focus:bg-white disabled:opacity-50"
              />
              <button
                onClick={() => void send()}
                disabled={pending || !input.trim()}
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#4356E0] text-white shadow-md shadow-indigo-200 transition-transform hover:scale-[1.03] disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </Card>
        </div>

        {/* Right side: Sidebar with Info and Quick queries */}
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Database size={16} className="text-[#4356E0]" />
              Database Access
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              This assistant executes secure, read-only SQL SELECT queries against our Turso database. It can instantly summarize information from all collections.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#4356E0]" />
              Quick Queries
            </h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => void send(action.prompt)}
                  disabled={pending}
                  className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-600 transition-all hover:bg-[#F0F3FF] hover:border-[#E0E5FB] hover:text-[#4356E0] disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
