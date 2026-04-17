import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { StudyBuddy } from "@/components/study-buddy";
import { useAuth } from "@/lib/auth";
import { RANKS, rankFromScore, nextRank, progressToNextRank } from "@/lib/ranks";

export const Route = createFileRoute("/ranks")({
  head: () => ({
    meta: [
      { title: "Ranks — DebateMind" },
      { name: "description", content: "8 ranks from Novice Thinker to Socrates Reborn. Earn points debating, quizzing and building arguments." },
      { property: "og:title", content: "Ranks — DebateMind" },
      { property: "og:description", content: "8 ranks. Earn points. Climb the ladder." },
    ],
  }),
  component: RanksPage,
});

function RanksPage() {
  const { profile } = useAuth();
  const score = profile?.total_score ?? 0;
  const current = rankFromScore(score);
  const next = nextRank(score);
  const progress = progressToNextRank(score);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-black mb-2">Rank <em className="text-gradient-arena not-italic">System</em></h1>
        <p className="text-sm text-muted-foreground mb-8">8 ranks · earn points by debating, quizzing, and building arguments.</p>

        <div className="rounded-2xl bg-gradient-card border border-border shadow-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-arena text-4xl shadow-arena">
              {current.emoji}
            </div>
            <div className="flex-1">
              <div className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">Current rank</div>
              <div className="font-display text-2xl font-black">{current.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{score} pts · 🔥 streak {profile?.current_streak ?? 0}</div>
            </div>
          </div>
          {next && (
            <div className="mt-5">
              <div className="flex justify-between text-xs font-arena uppercase tracking-widest text-muted-foreground mb-1.5">
                <span>To {next.name} {next.emoji}</span>
                <span>{score} / {next.threshold}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-arena transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {RANKS.map(r => {
            const reached = score >= r.threshold;
            const isCurrent = r.index === current.index;
            return (
              <div
                key={r.index}
                className={`rounded-2xl border p-4 transition ${
                  isCurrent ? "border-primary bg-neon-soft shadow-neon"
                  : reached ? "border-border bg-gradient-card"
                  : "border-border bg-card/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl">
                    {r.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.threshold} pts</div>
                  </div>
                  {isCurrent && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">YOU</span>}
                  {reached && !isCurrent && <span className="text-victory text-lg">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <StudyBuddy />
    </div>
  );
}
