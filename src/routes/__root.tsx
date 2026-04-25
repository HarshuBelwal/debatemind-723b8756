import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/language";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10 shadow-card">
        <div className="text-7xl mb-2">🧭</div>
        <h1 className="text-6xl font-display font-black text-gradient-arena">404</h1>
        <h2 className="mt-4 text-xl font-semibold">This page lost the debate</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or got rebutted into oblivion.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Back to the Arena
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DebateMind — AI Study Group · Quiz Battle · Argument Arena" },
      { name: "description", content: "Debate AI, crush quizzes, and build sharper arguments. Level up from Novice Thinker to Socrates Reborn in DebateMind." },
      { name: "author", content: "DebateMind" },
      { property: "og:title", content: "DebateMind — Battle of Ideas" },
      { property: "og:description", content: "Debate AI, crush quizzes, and build sharper arguments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <LanguageProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </LanguageProvider>
  );
}
