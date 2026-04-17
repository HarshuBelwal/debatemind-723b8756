import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { ArgumentBuilder } from "@/components/argument-builder";
import { StudyBuddy } from "@/components/study-buddy";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Argument Builder — DebateMind" },
      { name: "description", content: "Build a structured Toulmin argument — Claim, Evidence, Warrant, Rebuttal — and get instant AI analysis." },
      { property: "og:title", content: "Argument Builder — DebateMind" },
      { property: "og:description", content: "Toulmin model + instant AI feedback." },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-black mb-2">Argument <em className="text-gradient-arena not-italic">Builder</em></h1>
        <p className="text-sm text-muted-foreground mb-6">The Toulmin method: structure your case in four parts. Get scored 0-100.</p>
        <ArgumentBuilder />
      </main>
      <StudyBuddy />
    </div>
  );
}
