import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DebateMind" },
      { name: "description", content: "Sign in to DebateMind to save your score, streak, rank, and debate history across devices." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
        setMode("signin");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("Signed in with Google.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  const headline =
    mode === "signin" ? "Welcome back, debater" :
    mode === "signup" ? "Enter the Arena" :
    "Reset your password";
  const subline =
    mode === "signin" ? "Sign in to keep your score, streak and rank." :
    mode === "signup" ? "Create your account to save progress and climb ranks." :
    "We'll email you a secure link to set a new password.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-arena/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 py-8 sm:py-12">
        {/* Brand header */}
        <Link to="/" className="flex items-center justify-center gap-3 group">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-arena shadow-arena text-2xl transition group-hover:scale-105">
            ⚡
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-2xl font-black tracking-tight">DebateMind</span>
            <span className="font-arena text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Argument Arena
            </span>
          </span>
        </Link>

        {/* Card */}
        <div className="my-auto py-8 animate-rise">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-neon-soft px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {mode === "forgot" ? "Recovery" : "Account"}
            </span>
            <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">
              {mode === "signup" ? (
                <>Enter the <em className="text-gradient-arena not-italic">Arena</em></>
              ) : mode === "signin" ? (
                <>Welcome <em className="text-gradient-arena not-italic">back</em></>
              ) : (
                <>Reset <em className="text-gradient-arena not-italic">password</em></>
              )}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subline}</p>
          </div>

          <div className="rounded-2xl bg-gradient-card border border-border shadow-card p-6 sm:p-7">
            {mode !== "forgot" && (
              <div className="flex gap-1 rounded-lg bg-secondary/70 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-wider transition ${mode === "signin" ? "bg-primary text-primary-foreground shadow-neon" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-wider transition ${mode === "signup" ? "bg-primary text-primary-foreground shadow-neon" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign up
                </button>
              </div>
            )}

            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={googleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background/40 py-2.5 text-sm font-semibold hover:bg-background/70 hover:border-primary/40 transition disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.32z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  {googleLoading ? "Connecting…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-arena text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="font-arena text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Display name</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-background/80 transition"
                    placeholder="Socrates"
                  />
                </div>
              )}
              <div>
                <label className="font-arena text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-background/80 transition"
                />
              </div>
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-arena text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-background/80 transition"
                  />
                  {mode === "signup" && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">At least 6 characters.</p>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-arena py-3 text-sm font-bold uppercase tracking-wider text-arena-foreground shadow-arena transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 mt-1"
              >
                {loading ? "…" : mode === "signin" ? "⚔️ Sign in" : mode === "signup" ? "✦ Create account" : "Send reset link"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Back to sign in
                </button>
              )}
            </form>
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            By continuing you agree to play fair in the Arena.
          </p>
        </div>

        {/* Footer */}
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground transition">
          ← Back to the Arena
        </Link>
      </div>
    </div>
  );
}
