import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { callAI } from "@/lib/ai-client";
import { useLanguage } from "@/lib/language";
import { MicButton } from "./mic-button";
import { speak, stopSpeaking } from "@/lib/voice";

interface ChatMsg { role: "user" | "ai"; content: string }

const GREETINGS: Record<string, string> = {
  en: "Hey! I'm Study Buddy 🦉 — ask me to explain concepts, drill quiz topics, or coach your debate.",
  es: "¡Hola! Soy Study Buddy 🦉 — pídeme explicar conceptos, repasar temas de quiz o entrenar tu debate.",
  fr: "Salut ! Je suis Study Buddy 🦉 — demande-moi d'expliquer des concepts, de réviser des quiz ou de coacher ton débat.",
  de: "Hi! Ich bin Study Buddy 🦉 — frag mich nach Konzepten, Quiz-Themen oder Debatten-Coaching.",
  it: "Ciao! Sono Study Buddy 🦉 — chiedimi di spiegare concetti, fare quiz o allenare il tuo dibattito.",
  pt: "Olá! Sou o Study Buddy 🦉 — peça-me para explicar conceitos, treinar quizzes ou ensaiar debates.",
  nl: "Hé! Ik ben Study Buddy 🦉 — vraag me concepten uit te leggen, quizvragen te oefenen of je debat te coachen.",
  pl: "Cześć! Jestem Study Buddy 🦉 — poproś mnie o wyjaśnienie pojęć, ćwiczenie quizów lub trening debaty.",
  tr: "Selam! Ben Study Buddy 🦉 — kavram açıklamamı, quiz çalışmamı veya münazara koçluğunu iste.",
  ar: "مرحبًا! أنا Study Buddy 🦉 — اطلب مني شرح المفاهيم أو التدرب على الأسئلة أو تدريبك على المناظرة.",
  hi: "नमस्ते! मैं Study Buddy 🦉 हूँ — अवधारणाएँ समझाने, क्विज़ अभ्यास या बहस की कोचिंग के लिए पूछें।",
  bn: "হাই! আমি Study Buddy 🦉 — ধারণা ব্যাখ্যা, কুইজ অনুশীলন বা বিতর্ক কোচিংয়ের জন্য জিজ্ঞাসা করো।",
  ur: "ہائے! میں Study Buddy 🦉 ہوں — تصورات کی وضاحت، کوئز کی مشق یا مباحثے کی کوچنگ کے لیے پوچھیں۔",
  zh: "嗨！我是 Study Buddy 🦉 — 让我讲解概念、刷题或为你的辩论做指导。",
  ja: "やあ！Study Buddy 🦉 だよ — 概念の解説、クイズ対策、ディベートのコーチングを頼んでね。",
  ko: "안녕! 나는 Study Buddy 🦉 — 개념 설명, 퀴즈 연습, 토론 코칭을 부탁해 봐.",
  ru: "Привет! Я Study Buddy 🦉 — попроси объяснить концепции, прокачать квизы или потренировать дебаты.",
  id: "Hai! Aku Study Buddy 🦉 — minta aku menjelaskan konsep, latihan kuis, atau melatih debatmu.",
  vi: "Chào! Mình là Study Buddy 🦉 — hãy nhờ mình giải thích khái niệm, luyện quiz hay huấn luyện tranh luận.",
  sw: "Habari! Mimi ni Study Buddy 🦉 — niambie nieleze dhana, nikufunze maswali au nikufundishe mjadala.",
};

export function StudyBuddy() {
  const { language } = useLanguage();
  const greeting = GREETINGS[language.code] ?? GREETINGS.en;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: "ai", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refresh greeting when language changes (only if user hasn't chatted yet)
  useEffect(() => {
    setMsgs((prev) => (prev.length <= 1 ? [{ role: "ai", content: greeting }] : prev));
  }, [greeting]);

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
                }`}>
                  {m.role === "ai" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-arena">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
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
        </div>
      )}
    </>
  );
}
