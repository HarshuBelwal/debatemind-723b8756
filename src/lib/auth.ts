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

export async function awardPoints(_userId: string, points: number, _currentScore: number, _currentStreak: number) {
  // Server-side RPC clamps points (0-100) and increments atomically using auth.uid().
  // Client cannot tamper with score values.
  const { data, error } = await supabase.rpc("award_points", { p_points: Math.max(0, Math.floor(points)) });
  if (error) {
    console.error("award_points failed", error);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_score: row?.total_score ?? 0,
    current_streak: row?.current_streak ?? 0,
    best_streak: row?.best_streak ?? 0,
  };
}
