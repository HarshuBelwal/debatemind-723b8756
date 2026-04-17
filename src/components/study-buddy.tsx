import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { callAI } from "@/lib/ai-client";

interface ChatMsg { role: "user" | "ai"; content: string }

export function StudyBuddy() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "ai", content: "Hey! I'm Study Buddy 🦉 — ask me to explain concepts, drill quiz topics, or coach your debate." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function send() {
    if (!input.trim() || loading) return;
    const next: ChatMsg[] = [...msgs, { role: "user", content: input.trim() }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const r = await callAI<{ text: string }>("study_chat", {
        history: next.map(m => ({ role: m.role, content: m.content })),
      });
      setMsgs(m => [...m, { role: "ai", content: r.text }]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-arena text-2xl shadow-arena hover:scale-110 transition"
        aria-label="Open Study Buddy"
      >
        {open ? "✕" : "🦉"}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl glass shadow-arena overflow-hidden animate-rise">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-card">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦉</span>
              <div>
                <div className="font-display text-sm font-bold">Study Buddy</div>
                <div className="font-arena text-[9px] uppercase tracking-widest text-muted-foreground">Powered by AI</div>
              </div>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-1 px-3 text-arena">
                <span className="h-2 w-2 rounded-full bg-arena animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-border p-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button onClick={send} disabled={loading} className="rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">↑</button>
          </div>
        </div>
      )}
    </>
  );
}
