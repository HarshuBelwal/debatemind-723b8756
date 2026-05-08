import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { callAI } from "@/lib/ai-client";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MicButton } from "./mic-button";
import { speak } from "@/lib/voice";

interface ChatMsg { role: "user" | "ai"; content: string }
interface Conversation { id: string; title: string; last_preview: string | null; updated_at: string }

const GREETINGS: Record<string, string> = {
  en: "Hey! I'm Study Buddy 🦉 — ask me to explain concepts, drill quiz topics, or coach your debate.",
  es: "¡Hola! Soy Study Buddy 🦉 — pídeme explicar conceptos, repasar temas de quiz o entrenar tu debate.",
  fr: "Salut ! Je suis Study Buddy 🦉 — demande-moi d'expliquer des concepts, de réviser des quiz ou de coacher ton débat.",
  de: "Hi! Ich bin Study Buddy 🦉 — frag mich nach Konzepten, Quiz-Themen oder Debatten-Coaching.",
  it: "Ciao! Sono Study Buddy 🦉 — chiedimi di spiegare concetti, fare quiz o allenare il tuo dibattito.",
  pt: "Olá! Sou o Study Buddy 🦉 — peça-me para explicar conceitos, treinar quizzes ou ensaiar debates.",
  hi: "नमस्ते! मैं Study Buddy 🦉 हूँ — अवधारणाएँ समझाने, क्विज़ अभ्यास या बहस की कोचिंग के लिए पूछें।",
  zh: "嗨！我是 Study Buddy 🦉 — 让我讲解概念、刷题或为你的辩论做指导。",
  ja: "やあ！Study Buddy 🦉 だよ — 概念の解説、クイズ対策、ディベートのコーチングを頼んでね。",
  ar: "مرحبًا! أنا Study Buddy 🦉 — اطلب مني شرح المفاهيم أو التدرب على الأسئلة أو تدريبك على المناظرة.",
};

export function StudyBuddy() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const greeting = GREETINGS[language.code] ?? GREETINGS.en;
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: "ai", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, last_preview, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => { if (open) loadConversations(); }, [open, loadConversations]);

  useEffect(() => {
    setMsgs((prev) => (prev.length <= 1 ? [{ role: "ai", content: greeting }] : prev));
  }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function openConversation(id: string) {
    setActiveId(id);
    setShowHistory(false);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      setMsgs(data.length ? data.map(m => ({ role: m.role as "user" | "ai", content: m.content })) : [{ role: "ai", content: greeting }]);
    }
  }

  function newChat() {
    setActiveId(null);
    setMsgs([{ role: "ai", content: greeting }]);
    setShowHistory(false);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations(c => c.filter(x => x.id !== id));
    if (activeId === id) newChat();
  }

  async function persist(userMsg: string, aiMsg: string) {
    if (!user) return;
    let convId = activeId;
    if (!convId) {
      const title = userMsg.slice(0, 60);
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title, last_preview: aiMsg.slice(0, 120) })
        .select("id")
        .single();
      if (error || !data) return;
      convId = data.id;
      setActiveId(convId);
    } else {
      await supabase
        .from("chat_conversations")
        .update({ last_preview: aiMsg.slice(0, 120), updated_at: new Date().toISOString() })
        .eq("id", convId);
    }
    await supabase.from("chat_messages").insert([
      { conversation_id: convId, user_id: user.id, role: "user", content: userMsg },
      { conversation_id: convId, user_id: user.id, role: "ai", content: aiMsg },
    ]);
    loadConversations();
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const next: ChatMsg[] = [...msgs, { role: "user", content: userText }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const r = await callAI<{ text: string }>("study_chat", {
        history: next.map(m => ({ role: m.role, content: m.content })),
      });
      setMsgs(m => [...m, { role: "ai", content: r.text }]);
      persist(userText, r.text);
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
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl glass shadow-arena overflow-hidden animate-rise">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-card">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦉</span>
              <div>
                <div className="font-display text-sm font-bold">Study Buddy</div>
                <div className="font-arena text-[9px] uppercase tracking-widest text-muted-foreground">Powered by AI</div>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory(s => !s)}
                  className="rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:border-primary/40"
                  title="Chat history"
                >🕘 History</button>
                <button
                  onClick={newChat}
                  className="rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:border-primary/40"
                  title="New chat"
                >＋ New</button>
              </div>
            )}
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">No saved chats yet.</div>
              )}
              {conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`group flex cursor-pointer items-start justify-between gap-2 rounded-lg border px-3 py-2 transition hover:border-primary/40 ${
                    activeId === c.id ? "border-primary/60 bg-primary/5" : "border-border bg-card/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">{c.title}</div>
                    {c.last_preview && (
                      <div className="truncate text-[10px] text-muted-foreground">{c.last_preview}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => deleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-defeat text-xs"
                    title="Delete"
                  >🗑</button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}>
                      {m.role === "ai" ? (
                        <>
                          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-arena">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                          <button
                            onClick={() => speak(m.content).catch(() => toast.error("Voice failed"))}
                            className="mt-1 text-[10px] text-muted-foreground hover:text-arena transition"
                            title="Listen"
                          >🔊 Listen</button>
                        </>
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
                <MicButton onTranscript={(t) => setInput((v) => (v ? v + " " : "") + t)} />
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
