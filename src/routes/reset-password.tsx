import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — DebateMind" },
      { name: "description", content: "Set a new password for your DebateMind account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! You're signed in.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-arena shadow-arena text-2xl">⚡</span>
          <span className="font-display text-2xl font-black">DebateMind</span>
        </Link>

        <div className="rounded-2xl bg-gradient-card border border-border shadow-card p-6">
          <h1 className="font-display text-xl font-bold mb-1">Set a new password</h1>
          <p className="text-sm text-muted-foreground mb-5">
            {ready ? "Choose a strong password you'll remember." : "Verifying your reset link…"}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={!ready}
                className="mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="font-arena text-[10px] uppercase tracking-widest text-muted-foreground">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={!ready}
                className="mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full rounded-xl bg-gradient-arena py-2.5 text-sm font-bold text-arena-foreground shadow-arena disabled:opacity-50 mt-2"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        <Link to="/auth" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
