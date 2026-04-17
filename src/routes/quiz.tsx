import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { QuizBattle } from "@/components/quiz-battle";
import { StudyBuddy } from "@/components/study-buddy";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Battle — DebateMind" },
      { name: "description", content: "AI-generated quiz questions across General, Science, History, Logic and Philosophy. Beat the timer, climb the ranks." },
      { property: "og:title", content: "Quiz Battle — DebateMind" },
      { property: "og:description", content: "AI-generated quizzes. 30s timer. Live scoring." },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-black mb-2">Quiz <em className="text-gradient-arena not-italic">Battle</em></h1>
        <p className="text-sm text-muted-foreground mb-6">5 AI-generated questions. 30 seconds each. 15 pts per correct.</p>
        <QuizBattle />
      </main>
      <StudyBuddy />
    </div>
  );
}
