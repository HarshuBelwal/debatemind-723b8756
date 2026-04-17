/**
 * Wrapper around the /api/ai server route.
 */
export async function callAI<T = { text: string } | { result: unknown }>(
  task: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.error || `AI request failed (${r.status})`);
  }
  return data as T;
}
