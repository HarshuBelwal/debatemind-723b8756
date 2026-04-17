import { Link } from "@tanstack/react-router";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 grid-lines opacity-40" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-neon-soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Powered by AI · Live Debate Engine
          </span>
          <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] sm:text-7xl">
            Battle of
            <br />
            <em className="text-gradient-arena not-italic font-black">Ideas.</em>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Debate topics. Crush quizzes. Build arguments. Challenge an AI opponent — and emerge sharper.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              hash="arena"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-arena px-6 py-3 text-sm font-bold text-arena-foreground shadow-arena transition hover:scale-[1.02] active:scale-[0.98]"
            >
              ⚔️ Start Debate
            </Link>
            <Link
              to="/quiz"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-bold text-foreground transition hover:border-primary/60 hover:bg-card"
            >
              🧠 Quick Quiz
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground font-arena uppercase tracking-wider">
            <span>✦ 12 topics</span>
            <span>✦ 5 quiz categories</span>
            <span>✦ 8 ranks</span>
            <span>✦ Toulmin builder</span>
          </div>
        </div>

        <div className="relative mx-auto h-[320px] w-[320px] sm:h-[420px] sm:w-[420px]">
          <div className="absolute inset-0 rounded-full bg-gradient-arena opacity-30 blur-3xl" />
          <div className="ring-rotate absolute inset-0 rounded-full border-2 border-dashed border-primary/30" />
          <div className="absolute inset-6 rounded-full border border-arena/40" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display text-6xl font-black text-gradient-arena animate-float">VS</div>
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-card text-4xl shadow-card border border-primary/40">
              🧑‍🎓
            </div>
            <div className="mt-2 font-arena text-[10px] uppercase tracking-widest text-primary">You</div>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-card text-4xl shadow-card border border-arena/40">
              🤖
            </div>
            <div className="mt-2 font-arena text-[10px] uppercase tracking-widest text-arena">AI</div>
          </div>
          <span className="absolute left-1/4 top-1/4 text-arena text-2xl animate-spark" style={{ animationDelay: "0s" }}>✦</span>
          <span className="absolute right-1/4 top-1/4 text-primary text-2xl animate-spark" style={{ animationDelay: "0.6s" }}>✦</span>
          <span className="absolute left-1/4 bottom-1/4 text-gold text-xl animate-spark" style={{ animationDelay: "1.2s" }}>✦</span>
          <span className="absolute right-1/4 bottom-1/4 text-arena text-xl animate-spark" style={{ animationDelay: "1.8s" }}>✦</span>
        </div>
      </div>
    </section>
  );
}
