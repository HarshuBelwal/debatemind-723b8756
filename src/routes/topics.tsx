import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { StudyBuddy } from "@/components/study-buddy";
import { TOPICS, type TopicCategory } from "@/lib/topics";

const CATS: ("All" | TopicCategory)[] = ["All", "Ethics", "Tech", "Society", "Philosophy"];

export const Route = createFileRoute("/topics")({
  head: () => ({
    meta: [
      { title: "Topic Library — DebateMind" },
      { name: "description", content: "Browse 12+ debate topics across Ethics, Tech, Society and Philosophy. Pick a topic, choose your side, debate AI." },
      { property: "og:title", content: "Topic Library — DebateMind" },
      { property: "og:description", content: "12+ debate topics. Search, filter, and battle." },
    ],
  }),
  component: TopicsPage,
});

function TopicsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");

  const filtered = useMemo(() => {
    return TOPICS.filter(t =>
      (cat === "All" || t.category === cat) &&
      (q.trim() === "" || t.title.toLowerCase().includes(q.toLowerCase()))
    );
  }, [q, cat]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-black mb-2">Topic <em className="text-gradient-arena not-italic">Library</em></h1>
        <p className="text-sm text-muted-foreground mb-6">{TOPICS.length} debate topics. Pick one, then head to the Arena.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search topics…"
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                cat === c ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => navigate({ to: "/", hash: "arena" })}
              className="text-left rounded-2xl border border-border bg-gradient-card p-4 shadow-card hover:border-primary/50 hover:shadow-neon transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">{t.category}</span>
              </div>
              <div className="mt-3 font-display text-base font-bold leading-snug group-hover:text-primary transition">
                {t.title}
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-arena font-bold">
                Debate this →
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No topics match. Try a different search.
            </div>
          )}
        </div>
      </main>
      <StudyBuddy />
    </div>
  );
}
