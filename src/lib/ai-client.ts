import { getLanguageCodeSync, languageNameFromCode } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper around the /api/ai server route.
 * Attaches the user's selected language and Supabase auth token so the
 * server can validate the caller before invoking the AI gateway.
 */
export async function callAI<T = { text: string } | { result: unknown }>(
  task: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const code = getLanguageCodeSync();
  const language = languageNameFromCode(code);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to use the AI features.");
  }

  const r = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      task,
      payload: { ...payload, language, languageCode: code },
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.error || `AI request failed (${r.status})`);
  }
  return data as T;
}
