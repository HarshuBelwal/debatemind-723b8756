import { getLanguageCodeSync, languageNameFromCode } from "@/lib/language";

/**
 * Wrapper around the /api/ai server route.
 * Automatically attaches the user's selected language so the AI replies in it.
 */
export async function callAI<T = { text: string } | { result: unknown }>(
  task: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const code = getLanguageCodeSync();
  const language = languageNameFromCode(code);
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
