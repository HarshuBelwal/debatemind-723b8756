import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  total_score: number;
  current_streak: number;
  best_streak: number;
  rank_index: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // Subscribe FIRST, then fetch session (avoids race)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // Defer DB call to avoid recursion inside onAuthStateChange callback
        setTimeout(() => { refreshProfile(u.id); }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) refreshProfile(u.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, profile, loading, signOut, refreshProfile };
}

export async function awardPoints(userId: string, points: number, currentScore: number, currentStreak: number) {
  const newScore = currentScore + points;
  const newStreak = points > 0 ? currentStreak + 1 : 0;
  const { data: profile } = await supabase.from("profiles").select("best_streak").eq("id", userId).single();
  const bestStreak = Math.max(profile?.best_streak ?? 0, newStreak);

  await supabase
    .from("profiles")
    .update({
      total_score: newScore,
      current_streak: newStreak,
      best_streak: bestStreak,
    })
    .eq("id", userId);

  return { total_score: newScore, current_streak: newStreak, best_streak: bestStreak };
}
