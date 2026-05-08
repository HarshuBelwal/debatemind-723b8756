import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FeatureCard } from "./feature-card";
import { QUIZ_CATEGORIES, type QuizCategoryId } from "@/lib/topics";
import type { QuizQuestion } from "@/lib/types";
import { callAI } from "@/lib/ai-client";
import { useAuth, awardPoints } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const TIMER_SECONDS = 30;
const POINTS_PER_CORRECT = 15;
const MAX_SOURCE_CHARS = 12000;

export function QuizBattle() {
  const { user, profile, refreshProfile } = useAuth();
  const [category, setCategory] = useState<QuizCategoryId>("general");
  const [customTopic, setCustomTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [mode, setMode] = useState<"category" | "topic" | "source">("category");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }

  useEffect(() => () => clearTimer(), []);

  function startTimer() {
    clearTimer();
    setTimeLeft(TIMER_SECONDS);
    timer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimer();
          setChosen(-1); // timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function start() {
    if (mode === "topic" && customTopic.trim().length < 3) {
      toast.error("Enter a topic (at least 3 characters).");
      return;
    }
    if (mode === "source" && sourceText.trim().length < 50) {
      toast.error("Provide at least 50 characters of source text.");
      return;
    }
    setLoading(true);
    setDone(false);
    setScore(0);
    setIndex(0);
    setChosen(null);
    try {
      const r = await callAI<{ result: { questions: QuizQuestion[] } }>("quiz_generate", {
        category,
        count: questionCount,
        ...(mode === "topic" ? { customTopic: customTopic.trim() } : {}),
        ...(mode === "source" ? { sourceText: sourceText.slice(0, MAX_SOURCE_CHARS) } : {}),
      });
      setQuestions(r.result.questions);
      startTimer();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally { setLoading(false); }
  }

  async function handleFile(file: File) {
    if (!file) return;
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name);
    if (!isText) {
      toast.error("Only plain text files (.txt, .md, .csv, .json) are supported. Paste from PDFs/Docs.");
      return;
    }
    if (file.size > 1_000_000) {
      toast.error("File too large (max 1 MB).");
      return;
    }
    const text = await file.text();
    setSourceText(text.slice(0, MAX_SOURCE_CHARS));
    setSourceName(file.name);
    setMode("source");
  }

  function pick(i: number) {
    if (chosen !== null) return;
    clearTimer();
    setChosen(i);
    if (i === questions[index].correctIndex) {
      setScore(s => s + 1);
    }
  }

  async function next() {
    if (index + 1 < questions.length) {
      setIndex(i => i + 1);
      setChosen(null);
      startTimer();
    } else {
      setDone(true);
      const points = score * POINTS_PER_CORRECT;
      if (user && profile) {
        await supabase.from("quiz_attempts").insert({
          user_id: user.id,
          category: mode === "category" ? category : mode === "topic" ? `topic:${customTopic.trim().slice(0, 60)}` : `source:${sourceName ?? "pasted"}`,
          correct: score, total: questions.length, score_awarded: points,
        });
        if (points > 0) {
          await awardPoints(user.id, points, profile.total_score, profile.current_streak);
          await refreshProfile(user.id);
        }
        toast.success(`Round complete · +${points} pts`);
      } else {
        toast.info("Sign in to save your score.");
      }
    }
  }

  const q = questions[index];

  return (
    <FeatureCard
      icon="🧠"
      label="Quiz Battle"
      badge={questions.length > 0 && !done ? (
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold tracking-wider font-arena">
          {score} / {questions.length} · ⏱ {timeLeft}s
        </span>
      ) : null}
    >
      <div className="space-y-4">
        {/* Mode tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-background/40 p-1">
          {([
            { id: "category", label: "📚 Category" },
            { id: "topic", label: "✍️ My topic" },
            { id: "source", label: "📄 From document" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setQuestions([]); setDone(false); }}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                mode === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >{t.label}</button>
          ))}
        </div>

        {mode === "category" && (
          <div className="flex flex-wrap gap-1.5">
            {QUIZ_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.id); setQuestions([]); setDone(false); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  category === c.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}

        {mode === "topic" && (
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="e.g. The French Revolution, Photosynthesis, Stoicism…"
            maxLength={120}
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        )}

        {mode === "source" && (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-xs text-muted-foreground hover:border-primary/50">
              <input
                type="file"
                accept=".txt,.md,.csv,.json,text/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              📎 {sourceName ? `Loaded: ${sourceName}` : "Upload .txt / .md / .csv / .json"}
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => { setSourceText(e.target.value.slice(0, MAX_SOURCE_CHARS)); if (sourceName) setSourceName(null); }}
              placeholder="…or paste source text here (max ~12,000 chars)"
              rows={5}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
            <div className="text-right text-[10px] text-muted-foreground">{sourceText.length} / {MAX_SOURCE_CHARS}</div>
          </div>
        )}

        {/* Question count */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
          <label htmlFor="qcount" className="text-xs font-medium text-muted-foreground">Number of questions</label>
          <div className="flex items-center gap-2">
            <input
              id="qcount"
              type="range"
              min={3}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-32 accent-primary"
            />
            <span className="font-arena text-sm font-bold w-6 text-right">{questionCount}</span>
          </div>
        </div>

        {questions.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center">
            <div className="text-4xl mb-2">🧠</div>
            <div className="text-sm text-muted-foreground mb-4">Ready to test your knowledge?</div>
            <button
              onClick={start}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-neon hover:opacity-90 transition"
            >
              Start round · {questionCount} questions
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-border bg-background/40 p-8 text-center text-sm text-muted-foreground">
            Generating questions…
          </div>
        )}

        {q && !done && (
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">
                Q {index + 1} / {questions.length}
              </span>
              <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all ${timeLeft < 8 ? "bg-defeat" : "bg-primary"}`}
                  style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
                />
              </div>
            </div>
            <div className="font-display text-base font-bold mb-3">{q.question}</div>
            <div className="grid gap-2">
              {q.choices.map((c, i) => {
                const isCorrect = i === q.correctIndex;
                const isPicked = chosen === i;
                let cls = "border-border bg-card hover:border-primary/40";
                if (chosen !== null) {
                  if (isCorrect) cls = "border-victory/60 bg-victory/15 text-victory";
                  else if (isPicked) cls = "border-defeat/60 bg-defeat/15 text-defeat";
                  else cls = "border-border bg-card opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={chosen !== null}
                    className={`text-left rounded-lg border px-3 py-2.5 text-sm transition ${cls}`}
                  >
                    <span className="font-arena text-[10px] uppercase tracking-widest mr-2 text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {c}
                  </button>
                );
              })}
            </div>
            {chosen !== null && (
              <div className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
                {chosen === -1 ? "⏱ Time's up! " : ""}
                <strong className="text-foreground">Why:</strong> {q.explanation}
                <button
                  onClick={next}
                  className="ml-3 rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                >
                  {index + 1 < questions.length ? "Next →" : "Finish"}
                </button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="rounded-xl border border-gold/40 bg-gradient-gold/10 p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="font-display text-2xl font-black">{score} / {questions.length}</div>
            <div className="text-xs text-muted-foreground mt-1">+{score * POINTS_PER_CORRECT} pts earned</div>
            <button
              onClick={start}
              className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-neon"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </FeatureCard>
  );
}
