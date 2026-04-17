import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { DebateArena } from "@/components/debate-arena";
import { QuizBattle } from "@/components/quiz-battle";
import { ArgumentBuilder } from "@/components/argument-builder";
import { StudyBuddy } from "@/components/study-buddy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DebateMind — Battle of Ideas, Powered by AI" },
      { name: "description", content: "Debate AI on real topics, crush AI-generated quizzes, and build sharper Toulmin-style arguments." },
      { property: "og:title", content: "DebateMind — Battle of Ideas" },
      { property: "og:description", content: "Debate AI, crush quizzes, build sharper arguments." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Hero />
      <main id="arena" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 grid gap-6 md:grid-cols-2 scroll-mt-24">
        <DebateArena />
        <QuizBattle />
        <ArgumentBuilder />
      </main>
      <StudyBuddy />
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 text-center">
        <div className="font-display text-2xl font-black text-gradient-arena">⚡ Battle of Ideas</div>
        <div className="mt-2 font-arena text-[10px] uppercase tracking-widest text-muted-foreground">
          Made for thinkers, debaters, and lifelong learners
        </div>
      </div>
    </footer>
  );
}
