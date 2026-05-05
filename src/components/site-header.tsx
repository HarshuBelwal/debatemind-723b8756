import { useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { rankFromScore } from "@/lib/ranks";
import { LanguageSwitcher } from "@/components/language-switcher";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const score = profile?.total_score ?? 0;
  const streak = profile?.current_streak ?? 0;
  const rank = rankFromScore(score);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be under 3MB");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: upErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      if (upErr) throw upErr;
      await refreshProfile(user.id);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }


  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-arena shadow-arena text-xl">
            ⚡
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="font-display text-lg font-black tracking-tight">DebateMind</span>
            <span className="font-arena text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              AI Study Group · Quiz Battle · Argument Arena
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link to="/" activeOptions={{ exact: true }} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-secondary" }}>Arena</Link>
          <Link to="/quiz"        className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-secondary" }}>Quiz</Link>
          <Link to="/builder"     className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-secondary" }}>Builder</Link>
          <Link to="/topics"      className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-secondary" }}>Topics</Link>
          <Link to="/ranks"       className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-secondary" }}>Ranks</Link>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold text-ink shadow-card">
                <span>{rank.emoji}</span>
                <span>{score} pts</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                <span>🔥</span>
                <span>{streak}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
              >
                Sign out
              </button>
            </>
          )}
          {!user && (
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-neon hover:opacity-90 transition"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
