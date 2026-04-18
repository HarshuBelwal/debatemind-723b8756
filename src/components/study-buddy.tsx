import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { callAI } from "@/lib/ai-client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ChatMsg { role: "user" | "ai"; content: string }
interface Conversation {
  id: string;
  title: string;
  last_preview: string | null;
  updated_at: string;
}

const WELCOME: ChatMsg = {
  role: "ai",
  content: "Hey! I'm **Study Buddy** 🦉 — ask me to explain concepts, drill quiz topics, or coach your debate.",
};

export function StudyBuddy() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id,title,last_preview,updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  async function openConversation(id: string) {
    setConvId(id);
    setShowHistory(false);
    const { data } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      setMsgs(data.map(m => ({ role: m.role === "assistant" ? "ai" : "user", content: m.content })));
    }
  }

  function newChat() {
    setConvId(null);
    setMsgs([WELCOME]);
    setShowHistory(false);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations(c => c.filter(x => x.id !== id));
    if (convId === id) newChat();
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const next: ChatMsg[] = [...msgs, { role: "user", content: userText }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    let activeConv = convId;
    try {
      // Create conversation lazily on first user message
      if (user && !activeConv) {
        const title = userText.slice(0, 50);
        const { data: conv, error } = await supabase
          .from("chat_conversations")
          .insert({ user_id: user.id, title, last_preview: userText })
          .select("id")
          .single();
        if (!error && conv) {
          activeConv = conv.id;
          setConvId(conv.id);
        }
      }

      // Save user message
      if (user && activeConv) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConv,
          user_id: user.id,
          role: "user",
          content: userText,
        });
      }

      const r = await callAI<{ text: string }>("study_chat", {
        history: next.map(m => ({ role: m.role, content: m.content })),
      });

      setMsgs(m => [...m, { role: "ai", content: r.text }]);

      // Save assistant message + bump conversation
      if (user && activeConv) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConv,
          user_id: user.id,
          role: "assistant",
          content: r.text,
        });
        await supabase
          .from("chat_conversations")
          .update({ last_preview: r.text.slice(0, 120), updated_at: new Date().toISOString() })
          .eq("id", activeConv);
        loadConversations();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setLoading(false);
    }
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
        <div className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[400px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl glass shadow-arena overflow-hidden animate-rise">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-card">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦉</span>
              <div>
                <div className="font-display text-sm font-bold">Study Buddy</div>
                <div className="font-arena text-[9px] uppercase tracking-widest text-muted-foreground">Powered by AI</div>
              </div>
            </div>
            {user && (
              <div className="flex gap-1">
                <button
                  onClick={() => setShowHistory(s => !s)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  title="History"
                >
                  {showHistory ? "✕" : "🕘"}
                </button>
                <button
                  onClick={newChat}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  title="New chat"
                >
                  ＋
                </button>
              </div>
            )}
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No saved chats yet.</div>
              ) : (
                conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`group w-full rounded-lg border border-border bg-card/50 p-2 text-left text-xs hover:bg-muted transition ${convId === c.id ? "border-primary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold">{c.title}</div>
                        {c.last_preview && (
                          <div className="truncate text-muted-foreground mt-0.5">{c.last_preview}</div>
                        )}
                      </div>
                      <span
                        onClick={(e) => deleteConversation(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:scale-110 transition"
                        role="button"
                        aria-label="Delete chat"
                      >
                        🗑
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {!user && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    💡 Sign in to save your chat history.
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}>
                      {m.role === "ai" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
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
            </>
          )}
        </div>
      )}
    </>
  );
}
