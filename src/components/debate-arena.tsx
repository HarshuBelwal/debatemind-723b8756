import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { FeatureCard } from "./feature-card";
import { TOPICS } from "@/lib/topics";
import type { DebateMessage, DebateSide, DebateJudgment, DebateAnalysis, ArgumentScores, FactCheck } from "@/lib/types";
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
  const [scores, setScores] = useState<ArgumentScores>({ logic: 50, evidence: 50, emotional: 50, clarity: 50, confidence: 50 });
  const [factChecks, setFactChecks] = useState<Record<number, FactCheck>>({});
  const [offTopicCount, setOffTopicCount] = useState(0);

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
    setScores({ logic: 50, evidence: 50, emotional: 50, clarity: 50, confidence: 50 });
    setFactChecks({});
    setOffTopicCount(0);
  }

  async function submit() {
    if (!input.trim() || !topic || !side || loading) return;
    const userMsg: DebateMessage = { role: "user", content: input.trim(), ts: Date.now() };
    const next = [...transcript, userMsg];
    const userIndex = next.length - 1;
    setTranscript(next);
    setInput("");
    setLoading(true);
    try {
      const replyP = callAI<{ text: string }>("debate_reply", {
        topic, side,
        transcript: next.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
      });
      const analyzeP = callAI<{ result: DebateAnalysis }>("debate_analyze", {
        topic, side, userArgument: userMsg.content,
      }).catch(() => null);

      const [r, a] = await Promise.all([replyP, analyzeP]);

      setTranscript(t => [...t, { role: "ai", content: r.text, ts: Date.now() }]);
      if (autoSpeak) speak(r.text).catch(() => {});

      if (a?.result) {
        setScores(a.result.scores);
        setFactChecks(fc => ({ ...fc, [userIndex]: a.result.fact_check }));
        if (!a.result.on_topic) {
          const newCount = offTopicCount + 1;
          setOffTopicCount(newCount);
          const reason = a.result.off_topic_reason || "Stay focused on the topic.";
          toast.warning("⚠️ Off-topic", { description: reason });
          if (autoSpeak) {
            speak(`Calm down. Let's stay on topic. ${reason}`).catch(() => {});
          }
        } else {
          setOffTopicCount(0);
        }
        // Drift overall strength toward the average of logic+evidence+clarity
        const avg = Math.round((a.result.scores.logic + a.result.scores.evidence + a.result.scores.clarity) / 3);
        setStrength(avg);
      } else {
        setStrength(s => Math.max(15, Math.min(85, s + (Math.random() * 20 - 8))));
      }
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = customTopic.trim();
              if (t.length < 5) { toast.info("Topic must be at least 5 characters."); return; }
              setTopic(t); setSide(null); setTranscript([]); setVerdict(null); setStrength(50);
              setCustomTopic("");
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="✍️ Or type your own topic…"
              maxLength={200}
              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:scale-[1.02] transition">
              Use topic
            </button>
          </form>
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
              {transcript.map((m, i) => {
                const fc = m.role === "user" ? factChecks[i] : null;
                return (
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
                      {fc && (
                        <div className={`mt-1.5 rounded-md px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 ${
                          fc.status === "verified" ? "bg-victory/30 text-victory-foreground"
                          : fc.status === "misleading" ? "bg-defeat/30 text-defeat-foreground"
                          : "bg-secondary text-muted-foreground"
                        }`} title={fc.note}>
                          {fc.status === "verified" ? "✅ Verified" : fc.status === "misleading" ? "⚠️ Misleading" : "❔ Unverifiable"}
                          <span className="font-normal opacity-90">— {fc.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-1 px-3 py-2 text-arena">
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 rounded-full bg-arena animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              )}
              {verdict && (
                <div className="rounded-xl border border-gold/50 bg-gradient-gold/10 p-3 mt-2 space-y-2">
                  <div className="font-arena text-[10px] uppercase tracking-widest text-gold">
                    ⚖️ Verdict · Winner: {verdict.winner === "user" ? "🏆 You" : verdict.winner === "ai" ? "🤖 AI" : "🤝 Tie"} · +{verdict.score_awarded} pts
                  </div>
                  <div className="text-sm">{verdict.verdict}</div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {verdict.highlights.map((h, i) => <li key={i}>• {h}</li>)}
                  </ul>
                  {verdict.strengths && verdict.strengths.length > 0 && (
                    <div>
                      <div className="font-arena text-[10px] uppercase tracking-widest text-victory mt-1">💪 Strengths</div>
                      <ul className="text-xs text-muted-foreground">{verdict.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {verdict.weaknesses && verdict.weaknesses.length > 0 && (
                    <div>
                      <div className="font-arena text-[10px] uppercase tracking-widest text-defeat mt-1">🩹 Weaknesses</div>
                      <ul className="text-xs text-muted-foreground">{verdict.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {verdict.improvements && verdict.improvements.length > 0 && (
                    <div>
                      <div className="font-arena text-[10px] uppercase tracking-widest text-primary mt-1">🚀 How to improve</div>
                      <ul className="text-xs text-muted-foreground">{verdict.improvements.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live argument scoring */}
            <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
              <div className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">⚡ Live Argument Scoring</div>
              {([
                { key: "logic", label: "Logic", color: "bg-primary" },
                { key: "evidence", label: "Evidence", color: "bg-arena" },
                { key: "emotional", label: "Emotional appeal", color: "bg-devil" },
                { key: "clarity", label: "Speaking clarity", color: "bg-victory" },
                { key: "confidence", label: "Confidence", color: "bg-gold" },
              ] as const).map(row => (
                <div key={row.key} className="flex items-center gap-2">
                  <div className="w-28 text-[11px] text-muted-foreground">{row.label}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${row.color} transition-all duration-500`} style={{ width: `${scores[row.key]}%` }} />
                  </div>
                  <div className="w-8 text-right font-arena text-xs font-bold">{scores[row.key]}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-arena text-muted-foreground mb-1.5">
                <span>You</span>
                <span>Argument Strength{offTopicCount > 0 ? ` · ⚠️ off-topic ×${offTopicCount}` : ""}</span>
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
