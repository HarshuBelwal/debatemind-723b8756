import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { FeatureCard } from "./feature-card";
import { TOPICS } from "@/lib/topics";
import type { DebateMessage, DebateSide, DebateJudgment } from "@/lib/types";
import { callAI } from "@/lib/ai-client";
import { useAuth, awardPoints } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MicButton } from "./mic-button";
import { speak, stopSpeaking } from "@/lib/voice";

export function DebateArena() {
  const { user, profile, refreshProfile } = useAuth();
  const [topic, setTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [side, setSide] = useState<DebateSide | null>(null);
  const [transcript, setTranscript] = useState<DebateMessage[]>([]);
  const [input, setInput] = useState("");
  const [strength, setStrength] = useState(50);
  const [loading, setLoading] = useState(false);
  const [judging, setJudging] = useState(false);
  const [verdict, setVerdict] = useState<DebateJudgment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, verdict]);

  function pickRandom() {
    const t = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setTopic(t.title);
    setSide(null);
    setTranscript([]);
    setVerdict(null);
    setStrength(50);
  }

  function chooseSide(s: DebateSide) {
    setSide(s);
    const intro: DebateMessage = {
      role: "system",
      content: `Topic: "${topic}". You are arguing ${s.toUpperCase()}. Make your opening argument.`,
      ts: Date.now(),
    };
    setTranscript([intro]);
    setVerdict(null);
    setStrength(50);
  }

  async function submit() {
    if (!input.trim() || !topic || !side || loading) return;
    const userMsg: DebateMessage = { role: "user", content: input.trim(), ts: Date.now() };
    const next = [...transcript, userMsg];
    setTranscript(next);
    setInput("");
    setLoading(true);
    try {
      const r = await callAI<{ text: string }>("debate_reply", {
        topic, side,
        transcript: next.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
      });
      setTranscript(t => [...t, { role: "ai", content: r.text, ts: Date.now() }]);
      if (autoSpeak) speak(r.text).catch(() => {});
      // Drift strength a bit toward middle to keep the user engaged
      setStrength(s => Math.max(15, Math.min(85, s + (Math.random() * 20 - 8))));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setLoading(false);
    }
  }

  async function counter() {
    const lastUser = [...transcript].reverse().find(m => m.role === "user");
    if (!lastUser || !topic) return toast.info("Make an argument first.");
    setLoading(true);
    try {
      const r = await callAI<{ text: string }>("debate_counter", { topic, lastUserArgument: lastUser.content });
      setTranscript(t => [...t, { role: "ai", content: `🔄 Counter: ${r.text}`, ts: Date.now() }]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setLoading(false); }
  }

  async function hint() {
    if (!topic || !side) return;
    setLoading(true);
    try {
      const r = await callAI<{ text: string }>("debate_hint", { topic, side });
      toast.success("💡 Hint", { description: r.text, duration: 8000 });
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setLoading(false); }
  }

  async function judge() {
    if (!topic || !side || transcript.length < 2) return toast.info("Have a real exchange first.");
    setJudging(true);
    try {
      const r = await callAI<{ result: DebateJudgment }>("debate_judge", {
        topic, side,
        transcript: transcript.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
      });
      setVerdict(r.result);
      setStrength(r.result.user_strength);

      if (user && profile) {
        await supabase.from("debates").insert({
          user_id: user.id,
          topic,
          side,
          transcript: JSON.parse(JSON.stringify(transcript)),
          strength_user: r.result.user_strength,
          verdict: r.result.verdict,
          score_awarded: r.result.score_awarded,
        } as never);
        await awardPoints(user.id, r.result.score_awarded, profile.total_score, profile.current_streak);
        await refreshProfile(user.id);
        toast.success(`+${r.result.score_awarded} pts earned!`);
      } else {
        toast.info("Sign in to save your score and rank up.");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setJudging(false); }
  }

  return (
    <FeatureCard
      icon="⚔️"
      label="Debate Arena"
      badge={<span className="rounded-full bg-arena/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-arena tracking-wider">{side ? side : "Choose Side"}</span>}
      className="md:col-span-2"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">🎯 Current Topic</div>
          <div className="mt-1.5 font-display text-lg font-bold">
            {topic ?? "Pick a topic to begin your debate"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOPICS.slice(0, 6).map(t => (
              <button
                key={t.id}
                onClick={() => { setTopic(t.title); setSide(null); setTranscript([]); setVerdict(null); }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary/60 hover:bg-secondary transition"
              >
                {t.emoji} {t.title.length > 36 ? t.title.slice(0, 36) + "…" : t.title}
              </button>
            ))}
            <button onClick={pickRandom} className="rounded-full bg-gradient-arena px-3 py-1 text-xs font-bold text-arena-foreground shadow-arena hover:scale-[1.03] transition">
              🎲 Random
            </button>
          </div>
        </div>

        {topic && !side && (
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">⚡ Choose your stance</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => chooseSide("for")} className="rounded-lg bg-victory/15 border border-victory/40 px-3 py-2.5 text-sm font-bold text-victory hover:bg-victory/25 transition">👍 FOR</button>
              <button onClick={() => chooseSide("against")} className="rounded-lg bg-defeat/15 border border-defeat/40 px-3 py-2.5 text-sm font-bold text-defeat hover:bg-defeat/25 transition">👎 AGAINST</button>
              <button onClick={() => chooseSide("devil")} className="rounded-lg bg-devil/15 border border-devil/40 px-3 py-2.5 text-sm font-bold text-devil hover:bg-devil/25 transition">😈 Devil's</button>
            </div>
          </div>
        )}

        {side && (
          <>
            <div ref={scrollRef} className="h-72 overflow-y-auto rounded-xl border border-border bg-background/40 p-3 space-y-2.5">
              {transcript.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-primary text-primary-foreground"
                    : m.role === "ai" ? "bg-card border border-arena/30"
                    : "bg-secondary text-muted-foreground italic text-xs"
                  }`}>
                    {m.role === "ai" && (
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase tracking-widest text-arena font-arena">🤖 AI</div>
                        <button
                          onClick={() => speak(m.content).catch(() => toast.error("Voice failed"))}
                          className="text-[10px] text-muted-foreground hover:text-arena transition"
                          title="Listen"
                        >🔊</button>
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-1 px-3 py-2 text-arena">
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              )}
              {verdict && (
                <div className="rounded-xl border border-gold/50 bg-gradient-gold/10 p-3 mt-2">
                  <div className="font-arena text-[10px] uppercase tracking-widest text-gold">⚖️ Verdict · +{verdict.score_awarded} pts</div>
                  <div className="mt-1 text-sm">{verdict.verdict}</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {verdict.highlights.map((h, i) => <li key={i}>• {h}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-arena text-muted-foreground mb-1.5">
                <span>You</span>
                <span>Argument Strength</span>
                <span>AI</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-victory transition-all duration-500"
                  style={{ width: `${strength}%` }}
                />
                <div className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: "50%" }} />
              </div>
            </div>

            <div className="flex gap-2">
              <MicButton onTranscript={(t) => setInput((v) => (v ? v + " " : "") + t)} />
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Make your argument… (🎤 to speak, Enter to send)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                disabled={loading || judging}
              />
              <button
                onClick={submit}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-gradient-arena px-5 text-arena-foreground font-bold shadow-arena disabled:opacity-50 transition hover:scale-[1.02]"
              >
                Send
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={counter} disabled={loading} className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-arena/50 transition disabled:opacity-50">🔄 Counter me</button>
              <button onClick={hint} disabled={loading} className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/50 transition disabled:opacity-50">💡 Get a hint</button>
              <button onClick={judge} disabled={judging} className="rounded-md bg-gradient-gold px-3 py-1.5 text-xs font-bold text-ink shadow-card hover:scale-[1.03] transition disabled:opacity-50">
                {judging ? "Judging…" : "📊 Judge debate"}
              </button>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => { setAutoSpeak(e.target.checked); if (!e.target.checked) stopSpeaking(); }}
                  className="accent-arena"
                />
                🔊 Auto-speak
              </label>
            </div>
          </>
        )}
      </div>
    </FeatureCard>
  );
}
